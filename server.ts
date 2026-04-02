// Imports
import dotenv from 'dotenv'; // .env reading
import express, { Application } from 'express'; // server establishing
import os from 'os'; // getting server IP number
import path from 'path'; // serving static files
import WebSocket from 'ws'; // websocket establishing

// Types
import { DataTable, QlikCell, QlikRow, QlikTable } from './types/get-app-dataset';

// Routes
import datasetRoute from './routes/dataset';
import rootRoute from './routes/root';

// App init
const app: Application = express()

// App config
app.use(express.json())
app.use('/', express.static(path.join(__dirname, 'public')))

// Env files config
dotenv.config()

// Defining env variables setup
const PORT = process.env.PORT
const tenantUrl = process.env.TENANTURL
const appId = process.env.APPID
const apiKey = process.env.APIKEY
const systemTables = process.env.SYSTEM_TABLES === '1'

// REST
app.use('/', rootRoute)
app.use('/api/dataset', datasetRoute)

// Main server endpoint logic to fetch tables data
app.get('/get-app-dataset', async (_, res) => {
  console.log('-----')
  console.log('Trying to access /get-app-dataset')

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
      console.error('WebSocket error:', err)

      if (!res.headersSent) {
        res.status(401).json({
          message: 'WebSocket connection failed. Please check .env file and make sure all file params are valid.',
          error: err.message
        })
      }
    })

    // "Open" websocket event
    ws.on('open', () => {
      console.log('-----')
      console.log(`Connected to App:${appId}`)

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

        console.log('-----')
        console.log(`Qlik response (id: ${data.id}):`, data)

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
              time: null,
              rows: []
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
              qOffset: 0,
              qRows: dataTables[0].rowCount,
              qSyntheticMode: false,
              qTableName: dataTables[0].name
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
            dataTables[index].time = Math.round((duration / 1000) * 100) / 100
            console.log(`⏱️ ${dataTables[index].name}: ${duration.toFixed(2)} ms`)
          }

          // Saving table rows information to specific table inside dataTables variable
          table.rows = dataRows

          // If there are still tables left that need the rows data, send another incremental request
          if (index + 1 < dataTables.length) {
            ws.send(JSON.stringify({
              jsonrpc: '2.0',
              id: (tableRequesterId + index + 1),
              method: 'GetTableData',
              handle: appHandle,
              params: {
                qOffset: 0,
                qRows: dataTables[index + 1].rowCount,
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
            res.send(dataTables)

            // Close connection when everything is done
            ws.close()
          }
        }
      })

      // On closing wesbocket connection, send information to the console
      ws.on('close', () => {
        console.log('-----')
        console.log(`Disconnected from App:${appId}`)
      })
    })
  } catch (err) {
    res.send(err)
  }
})

// Getting local IP for app.listen console.log
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();

  for (const name in interfaces) {
    const addrs = interfaces[name];
    if (!addrs) continue; // <-- jeśli undefined, pomijamy

    for (const iface of addrs) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return 'localhost';
}

// Starting the server
app.listen(PORT, () => {
  const ip = getLocalIP()

  console.log(`Server's running at http://${ip}:${PORT}`)
})