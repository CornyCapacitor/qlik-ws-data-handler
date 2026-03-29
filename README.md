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

### Example Usage in Code

#### .env

```env
PORT=3474
TENANTURL=haflsxq4uerhm9k.eu
APPID=d1935524-4eec-487a-bd7c-c44b0f5ad604
APIKEY=eyJhbGciOiJFUzM4NCIsImtpZCI6ImU4OGQ5ZTFiLWQwODktNGRjNy04MmYyLWYwZjAyZjUwMWJjNSIsInR5cCI6IkpXVCJ9.eyJzdWJUeXBlIjoidXNlciIsInRlbmFudElkIjoiMFU5aUhaQnRmSU5YVUtnZEVLX1NxdEwzbnItclNOTXoiLCJqdGkiOiJlODhkOWUxYi1kMDg5LTRkYzctODJmMi1mMGYwMmY1MDFiYzUiLCJhdWQiOiJxbGlrLmFwaSIsImlzcyI6InFsaWsuYXBpL2FwaS1rZXlzIiwic3ViIjoiNjljMjU1N2RhMmFmZGVhMDY4MTMzNTllIn0.cOtcdt2fBQ7UslyG27G_AUiJffTtjFxnGdYuPwSoBVLcZH3kUAZEh_1KE1jgBvbASkd3DXpjC3fXnlWizLeK2h5WBTGIzHL_YNWPB-vZ07HYCgFcRqrJYIuJ-scUxdsh
SYSTEM_TABLES=0
```

#### index.js

```javascript
const PORT = process.env.PORT
const tenantUrl = process.env.TENANTURL
const appId = process.env.APPID
const apiKey = process.env.APIKEY
const systemTables = process.env.SYSTEM_TABLES === '1'
```