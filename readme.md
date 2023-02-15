## Prerequisites
NodeJS and NPM is required.

## Prepare
- Extract archive
- Run `npm istall`
- Run `npm run build`
- Run `npm run start`

## API
All endpoints require `application/json` content-type header except the `/api/dsl` which accepts `text/plain`
- 3 basic resources available (POST/GET/PUT/DELETE):
    
    List fetching not supported
  - Company `/api/companies/:id` < `{id: number, name: string}`
  - StationType `/api/station-types/:id` < `{id: number, name: string, maxPower: number}`
  - Station `/api/stations/:id` < `{id: number, name: string, typeId: number, companyId: number }`
- Get company stations include the child companies stations `GET /api/companies/:id/stations`
- Set company parent `POST /api/companies/:id/set-parent` < `{ "parentId": 2 }`
- Parse script `POST /api/dsl` < script in body
```
Begin
Start station 1
Wait 5
Start station 2
Wait 10
Start station all
Wait 10
Stop station 2
Wait 10
Stop station 3
Wait 5
Stop station all
End
  ```
