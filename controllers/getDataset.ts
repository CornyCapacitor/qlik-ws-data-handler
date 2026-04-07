import { Request, Response } from 'express';
import WebSocket from 'ws'; // websocket establishing
import { DataTable, QlikCell, QlikRow, QlikTable } from '../types/dataset';

export const getDataset = async (req: Request, res: Response): Promise<Response | void> => {
  console.log('-----')
  console.log('Trying to access /get-app-dataset')

  const tenantUrl = process.env.TENANTURL
  const appId = process.env.APPID
  const apiKey = process.env.APIKEY
  const systemTables: boolean = process.env.SYSTEM_TABLES === '1' || false
  const singleRequestLimit: number = Number(process.env.SINGLE_REQUEST_LIMIT) || 100000
  const logging = process.env.LOGGING || 0

  // Establishing websocket connection and storing it inside ws variable
  try {
    const ws = new WebSocket(
      `wss://${tenantUrl}.qlikcloud.com/app/${appId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`
        },
        // Changing max payload size
        maxPayload: Infinity
      }
    )

    // "Error" websocket event
    ws.on('error', (err) => {
      console.error(err)
      if (!res.headersSent) {
        res.json({ error: err.message })
      }
    })

    // "Open" websocket event
    ws.on('open', () => {
      logging ?? console.log('-----')
      logging ?? console.log(`Connected to App:${appId}`)

      // Defining websocket variables
      let appHandle: number | null = null
      let dataTables: DataTable[] | null = null
      let tableRequesterId = 100
      const timeTrack = new Map()

      // Requesting app connection
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'OpenDoc',
        handle: -1,
        params: [appId]
      }));

      // "Message" websocket event inside "Open"
      ws.on('message', (msg) => {
        // Parsing data received to JSON
        const data = JSON.parse(msg.toString())

        // Check if message received has ID
        if (!data.id) return

        logging ?? console.log('-----')
        logging ?? console.log(`Qlik response (id: ${data.id}):`, data)

        // Reading app connection request
        if (data.id === 1) {
          // Storing websocket handle value for this unique connection inside "appHandle" variable
          appHandle = data.result.qReturn.qHandle

          // Check if message received an appHandle ID
          if (!appHandle) return

          // Requesting tables information
          ws.send(JSON.stringify({
            jsonrpc: "2.0",
            id: 2,
            handle: appHandle,
            method: "GetTablesAndKeys",
            params: {
              qWindowSize: {
                qcx: 123,
                qcy: 123
              },
              qNullSize: {
                qcx: 123,
                qcy: 123
              },
              qCellHeight: 123,
              qSyntheticMode: true,
              qIncludeSysVars: true,
              qIncludeProfiling: true
            }
          })
          )
        }

        // Reading tables information request
        if (data.id === 2) {
          // Storing basic tables information inside "dataTables" variable
          dataTables = data.result.qtr
            .map((table: QlikTable) => ({
              name: table.qName,
              columnCount: table.qFields.length,
              columns: table.qFields.map(column => column.qName),
              rowCount: table.qNoOfRows,
              time: 0,
              rows: [],
              offset: 0,
              chunkSize: Math.min(table.qNoOfRows, singleRequestLimit)
            }))

          // Check if dataTables exists
          if (!dataTables) {
            return res.send({
              message: 'There seems to be a problem with dataTables variable inside code.',
              error: 'Variable dataTables is either null or does not exist'
            })
          }

          // Additional filtering based on SYSTEM_TABLES setting inside .env (0 - filters system tables, 1 - load system tables and its data)
          if (!systemTables) {
            dataTables = dataTables.filter(table => !table.name.startsWith('$$SysTable'))
          }

          // Requesting first table which starts table request loop
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: tableRequesterId,
            method: 'GetTableData',
            handle: appHandle,
            params: {
              qOffset: dataTables[0].offset,
              qRows: dataTables[0].chunkSize,
              qSyntheticMode: false,
              qTableName: dataTables[0].name,
            }
          }));

          // Saving first timestamp request to timeTrack variable
          timeTrack.set(tableRequesterId, {
            requestTime: performance.now(),
            responseTime: null
          })
        }

        // Light repeatable approach to handle every data request separately. This block of code simply reads responses from websocket about requested table matching its id with already stored basic tables variable and if there are still tables that need to download rows, it requests another and prepares for another data reading. The reason why index of 100 is used simply implies that this block of code while should not be changed, can be executed after several other custom ids above, in order to prevent id usage doublet
        if (data.id >= tableRequesterId) {
          // Defining basic variables for concatenation & verification
          // Check if dataTables exists
          if (!dataTables) {
            return res.send({
              message: 'There seems to be a problem with dataTables variable inside code.',
              error: 'Variable dataTables is either null or does not exist'
            })
          }

          const index = data.id - tableRequesterId
          const table = dataTables[index]
          const currentTableTime = table.time

          // Reading table rows from websocket response
          const tableData = data.result
          const dataRows: Record<string, string>[] = tableData.qData.map((row: QlikRow) => {
            const rowObj: Record<string, string> = {}
            row.qValue.forEach((cell: QlikCell, i: number) => {
              rowObj[table.columns[i]] = cell.qText
            })
            return rowObj
          })

          // Save response time for calculation
          const timing = timeTrack.get(data.id)
          if (timing) {
            timing.responseTime = performance.now()

            const duration = timing.responseTime - timing.requestTime
            dataTables[index].time = currentTableTime + Math.round((duration / 1000) * 100) / 100
          }

          // Add table rows information to specific table inside dataTables variable
          table.rows.push(...dataRows)

          // Check if the table is fully fetched
          if (table.rows.length !== table.rowCount) {
            // Defining new offset and chunkSize values for that table
            const newOffset = table.offset + singleRequestLimit
            const newChunkSize = Math.min(singleRequestLimit, (table.rowCount - newOffset))

            // If there are still rows to be fetched
            console.log(`Need to fetch more for table: ${table.name}. Currently fetched: ${newOffset} rows. Next fetch: ${newChunkSize} rows. Actual fetch time: ${table.time}`)

            table.offset = newOffset
            table.chunkSize = newChunkSize

            ws.send(JSON.stringify({
              jsonrpc: '2.0',
              id: (tableRequesterId + index),
              method: 'GetTableData',
              handle: appHandle,
              params: {
                qOffset: table.offset,
                qRows: table.chunkSize,
                qSyntheticMode: false,
                qTableName: table.name
              }
            }))

            // Save request time for calculation
            timeTrack.set((tableRequesterId + index), {
              requestTime: performance.now(),
              responseTime: null
            })

          } else {
            // If there are all rows fetched for that table
            console.log(`All rows fetched for table: ${table.name}. Rows: ${table.rowCount}. Total time: ${table.time}`)

            // If there are still tables left that need the rows data, send another incremental request
            if (index + 1 < dataTables.length) {
              ws.send(JSON.stringify({
                jsonrpc: '2.0',
                id: (tableRequesterId + index + 1),
                method: 'GetTableData',
                handle: appHandle,
                params: {
                  qOffset: dataTables[index + 1].offset,
                  qRows: dataTables[index + 1].chunkSize,
                  qSyntheticMode: false,
                  qTableName: dataTables[index + 1].name
                }
              }))

              // Save request time for calculation
              timeTrack.set((tableRequesterId + index + 1), {
                requestTime: performance.now(),
                responseTime: null
              })

              // If everything is loaded, send response of dataTables variable
            } else {
              // Close connection when everything is done
              ws.close()

              // Delete offset and chunkSize from all tables
              const cleanedTables = dataTables.map(({ offset, chunkSize, ...rest }) => rest)

              // Save to JSON file in root
              // const filePath = path.join(__dirname, 'dataTables.json')
              // fs.writeFile(filePath, JSON.stringify(cleanedTables, null, 2), (err) => {
              //   if (err) {
              //     console.error('Error writing JSON file:', err)
              //   } else {
              //     console.log(`Data saved to ${filePath}`)
              //   }
              // })

              // Return data
              return res.send(cleanedTables)
            }
          }
        }
      })

      // On closing wesbocket connection, send information to the console
      ws.on('close', () => {
        logging ?? console.log('-----')
        logging ?? console.log(`Disconnected from App:${appId}`)
      })
    })
  } catch (err) {
    // Return error
    return res.send(err)
  }
}