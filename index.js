import express from 'express'
import WebSocket from 'ws'
const app = express()

const PORT = 3474
const tenantUrl = 'haflsxq4uerhm9k.eu'
const appId = 'd1935524-4eec-487a-bd7c-c44b0f5ad604'
const apiKey = 'eyJhbGciOiJFUzM4NCIsImtpZCI6ImIzNzI1ZDliLTY4OWUtNGFiOC04MDhmLTFiZmNiMGEzYjE3MiIsInR5cCI6IkpXVCJ9.eyJzdWJUeXBlIjoidXNlciIsInRlbmFudElkIjoiMFU5aUhaQnRmSU5YVUtnZEVLX1NxdEwzbnItclNOTXoiLCJqdGkiOiJiMzcyNWQ5Yi02ODllLTRhYjgtODA4Zi0xYmZjYjBhM2IxNzIiLCJhdWQiOiJxbGlrLmFwaSIsImlzcyI6InFsaWsuYXBpL2FwaS1rZXlzIiwic3ViIjoiNjljMjU1N2RhMmFmZGVhMDY4MTMzNTllIn0.aWsoIRmDRWVAd494aD-dcEGG5TeQsVnDzzYptV8UO1_CRZk7VzSLxH_zfsmFXs65DTyk-pP5EerD362cNRzhPwzqRpXtbrGIrmm8WgPukbWu9sqQwJsPl_pTdEly7R6V'

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

    let appHandle
    let cubeHandle

    // Get into the app
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: "OpenDoc",
      handle: -1,
      params: [`${appId}`]
    }))

    // Returning message handler
    ws.on('message', (msg) => {
      const data = JSON.parse(msg.toString())
      console.log('-----')
      console.log('Qlik response:', data)

      // If no data, return
      if (!data.id) return

      // ##### 1 #####

      // If data, proceed
      if (data.id === 1) {
        appHandle = data.result.qReturn.qHandle

        console.log('-----')
        console.log('App handle:', appHandle)

        // Data model download
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'CreateSessionObject',
          handle: appHandle,
          params: [{
            qInfo: { qType: 'test' },
            qHyperCubeDef: {
              qDimensions: [],
              qMeasures: [
                { qDef: { qDef: 'Count(*)' } }
              ],
              qInitialDataFetch: [{
                qTop: 0,
                qLeft: 0,
                qHeight: 1,
                qWidth: 1
              }]
            }
          }]
        }))
      }

      // ##### 2 #####

      // Handling CreateSessionObject creation & sending GetLayout request
      if (data.id === 2) {
        cubeHandle = data.result.qReturn.qHandle;

        console.log('-----')
        console.log('Cube handle:', cubeHandle);

        // 🔥 TERAZ pobieramy dane
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'GetLayout',
          handle: cubeHandle,
          params: []
        }));
      }

      // ##### 3 #####

      if (data.id === 3) {
        const cube = data.result.qLayout.qHyperCube
        const info = data.result.qLayout.qInfo
        const meta = data.result.qLayout.qMeta
        const rawData = JSON.stringify(cube, null, 2)

        console.log('-----')
        console.log('RAW DATA:', rawData);

        console.log('-----')
        console.log('cube:', cube);

        console.log('-----')
        console.log('info:', info);

        console.log('-----')
        console.log('meta:', meta);

        ws.close();
      }
    })

    // ##### 4 #####

    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'GetTablesAndKeys',
      handle: appHandle,
      params: [{
        qWindowSize: { qcx: 1000, qcy: 1000 }
      }]
    }))

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