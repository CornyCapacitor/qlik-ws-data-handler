import dotenv from 'dotenv'
import express from 'express'
import WebSocket from 'ws'
const app = express()

dotenv.config()

const PORT = process.env.PORT
const tenantUrl = process.env.TENANTURL
const appId = process.env.APPID
const apiKey = process.env.APIKEY

// JSON Middleware
app.use(express.json())

// Get Qlik data
app.get('/qlik', async (req, res) => {
  console.log('-----')
  console.log('Trying to acess /qlik')
  const ws = new WebSocket(
    `wss://${tenantUrl}.qlikcloud.com/app/${appId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    }
  )

  ws.on('open', () => {
    console.log('-----')
    console.log(`Connected to App:${appId}`)

    // ##### 0 - websocket variables #####
    let appHandle = null
    let dataTables = null

    // ##### 1 - Getting into the app #####
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'OpenDoc',
      handle: -1,
      params: [appId]
    }));

    ws.on('message', (msg) => {
      const data = JSON.parse(msg.toString())

      if (!data.id) return

      console.log('-----')
      console.log(`Qlik response (id: ${data.id}):`, data)

      if (data.id === 1) {
        appHandle = data.result.qReturn.qHandle

        if (!appHandle) return

        // ##### 2 - Getting information about tables #####
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

      if (data.id === 2) {
        dataTables = data.result.qtr.map(table => ({
          name: table.qName,
          columnCount: table.qFields.length,
          columns: table.qFields.map(column => column.qName),
          rowCount: table.qNoOfRows,
          rows: []
        }))

        console.log('Data tables:', dataTables)

        // ##### 3 - Getting information about single table #####
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'GetTableData',
          handle: appHandle,
          params: {
            qOffset: 0,
            qRows: dataTables[0].rowCount,
            qSyntheticMode: false,
            qTableName: dataTables[0].name
          }
        }));
      }

      if (data.id === 3) {
        const tableData = data.result
        const dataRows = tableData.qData.map(row => {
          const rowObj = {}
          row.qValue.forEach((cell, idx) => {
            rowObj[dataTables[0].columns[idx]] = cell.qText
          })
          return rowObj
        })

        dataTables[0].rows = dataRows

        console.log('dataTables[0]:', dataTables[0])

        res.send(dataTables[0])
      }
    })

    ws.on('close', () => {
      console.log('-----')
      console.log(`Disconnected from App:${appId}`)
    })
  })
})


// App Listening
app.listen(PORT, () => {
  console.log(`Server's running on http://localhost:${PORT}`)
})