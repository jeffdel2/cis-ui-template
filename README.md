# Auth Rocks UI

This Glitch app is based on the [Okta SPA JS Login Quickstart](https://github.com/auth0-samples/auth0-javascript-samples/tree/master/01-Login) and the [Auth0 Calling an API Quickstart](https://github.com/auth0-samples/auth0-javascript-samples/tree/master/02-Calling-an-API).

It is part of the Auth Rocks developer workshop presented by [Okta](https://okta.com)

## Configuring the App

```json
{
  "Okta CIS instance URL": "{ORG_URL}",
  "Client ID": "{CLIENT_ID}",
  "Client Secret": "{CLIENT_SECRET}"
}
```

### Challenge 1

1. Copy the {ORG_URL}, {CLIENT_ID}, and {CLIENT_SECRET} from the web app created in your CIS tenant and paste in the **.okta.env** file.

### Challenge 2

1. Copy the {API_AUDIENCE} from the API create in your tenant and paste in the **auth_config.json** file.

2. Copy the URL from the Glitch API app and paste in `var baseAPIUrl = "Enter Glitch API URL here";` (on line 15) in **support/client.js**


---