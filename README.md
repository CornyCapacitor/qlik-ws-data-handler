# Qlik API Engine Test

A simple Express.js server to test the Qlik API Engine with a landing page and the ability to preview set data at `/qlik`.

## Environment Variables

To run the server correctly, create a `.env` file in the project root.

### Variable Descriptions

| Variable | Description |
|----------|-------------|
| `PORT` | Port on which the server will listen (e.g., `3474`). |
| `TENANTURL` | The URL of your Qlik Cloud tenant or Qlik Sense Enterprise. |
| `APPID` | The ID of the Qlik app you want to test. |
| `APIKEY` | API Key for authentication with the Qlik API. |
| `SYSTEM_TABLES` | Flag (`0` or `1`) to decide whether system tables (`$$SysTable`) appear in results. `1` = enabled, `0` = disabled. |

### Variables usage in Code

##### index.js

```javascript
const PORT = process.env.PORT
const tenantUrl = process.env.TENANTURL
const appId = process.env.APPID
const apiKey = process.env.APIKEY
const systemTables = process.env.SYSTEM_TABLES === '1'
```

## Running server

Make sure you have Node.js installed. If not, download it [here](https://nodejs.org/en/download/).

### 1. Clone the code via `git clone` or download repository directly from github
##### This will clone this repository to your local machine.

```powershell
git clone https://github.com/CornyCapacitor/qlik-ws-data-handler
```

### 2. Install dependencies
##### Install all required Node.js packages to run the server.

```powershell
npm install
```

### 3. Create .env file in root directory
##### Create a .env file in the project root to provide configuration values for connecting to your Qlik app using websocket.

```env
PORT=3474
TENANTURL=haflsxq4uerhm9k.eu
APPID=d1935524-4eec-487a-bd7c-c44b0f5ad604
APIKEY=eyJhbGciOiJFUzM4NCIsImtpZCI6ImU4OGQ5ZTFiLWQwODktNGRjNy04MmYyLWYwZjAyZjUwMWJjNSIsInR5cCI6IkpXVCJ9.eyJzdWJUeXBlIjoidXNlciIsInRlbmFudElkIjoiMFU5aUhaQnRmSU5YVUtnZEVLX1NxdEwzbnItclNOTXoiLCJqdGkiOiJlODhkOWUxYi1kMDg5LTRkYzctODJmMi1mMGYwMmY1MDFiYzUiLCJhdWQiOiJxbGlrLmFwaSIsImlzcyI6InFsaWsuYXBpL2FwaS1rZXlzIiwic3ViIjoiNjljMjU1N2RhMmFmZGVhMDY4MTMzNTllIn0.cOtcdt2fBQ7UslyG27G_AUiJffTtjFxnGdYuPwSoBVLcZH3kUAZEh_1KE1jgBvbASkd3DXpjC3fXnlWizLeK2h5WBTGIzHL_YNWPB-vZ07HYCgFcRqrJYIuJ-scUxdsh
SYSTEM_TABLES=0
```

### 4. Start server
##### Run the server on the port specified in your .env. After starting, open your browser at http://localhost:PORT to see the landing page.

```powershell
npm start
```

## Reading the response

##### Each table in the response follows a consistent structure. Here’s a description of the fields you can expect:

| Variable | Description |
|----------|-------------|
| `name` | The name of the table |
| `columnCount` | Number of columns in the table. |
| `columns` | Array of column names. |
| `rowCount` | Number of rows in the table. |
| `time` | Time taken to fetch the table, measured from sending the request to receiving the response (in seconds). |
| `rows` |Array of row objects, each containing key-value pairs corresponding to column names and their values. |

Note: The time field is calculated per table and reflects the total fetch duration, which can help identify slower tables in your Qlik app.