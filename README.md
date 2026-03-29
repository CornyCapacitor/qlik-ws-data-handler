# Qlik API Engine Test

A simple Express.js server to test the Qlik API Engine with a landing page and the ability to preview set data at `/qlik`.

## Environment Variables

To run the server correctly, create a `.env` file in the project root. Example `.env`:

PORT=3000
TENANTURL=https://your-tenant.qlikcloud.com
APPID=12345-abcde-67890
APIKEY=your-api-key
SYSTEM_TABLES=1

### Variable Descriptions

| Variable | Description |
|----------|-------------|
| `PORT` | Port on which the server will listen (e.g., `3000`). |
| `TENANTURL` | The URL of your Qlik Cloud tenant or Qlik Sense Enterprise. |
| `APPID` | The ID of the Qlik app you want to test. |
| `APIKEY` | API Key for authentication with the Qlik API. |
| `SYSTEM_TABLES` | Flag (`0` or `1`) to decide whether system tables (`$$SysTable`) appear in results. `1` = enabled, `0` = disabled. |

### Example Usage in Code

```javascript
// Defining env variables setup
const PORT = process.env.PORT;
const tenantUrl = process.env.TENANTURL;
const appId = process.env.APPID;
const apiKey = process.env.APIKEY;
const systemTables = process.env.SYSTEM_TABLES === '1';