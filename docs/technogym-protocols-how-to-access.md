# Technogym Protocols - How to Access

**Source:** Technogym Enterprise API Documentation (https://openplatformdocs.mywellness.com/)
**Date Reviewed:** 15 December 2025

---

## Introduction

Technogym Enterprise API allows the partner to access the powerful features available in mywellness cloud that are widely used by Technogym touchpoints. This enables the partner to design, develop, test, pilot, roll-out and maintain the partner mobile application on all countries where it operates.

## Main API Components

The main component of the Technogym Enterprise API that will be provided by Technogym are described in the following table:

| API | Details of the main functionalities |
|-----|-------------------------------------|
| **USER** | Partner platform uses the Technogym API to create/update/delete users on Technogym platform. All the behavioural data (results, test, etc) are saved on that user and could be retrieved by the partner platform via API. |
| **EQUIPMENT LOGIN AND TRACKING** | Login on Technogym smart equipment and format via mobile app using QR code, track indoor results. |
| **PRESCRIPTION** | List program and workouts, view details, track results automatically and manually. |
| **BIOMETRICS AND MEASUREMENTS** | List measurements taken using Technogym CheckUp and access to user's wellness age data and categories. List biometric measurement data and access historical data |
| **TRAINING RESULTS** | List workout sessions done in the club and access session's details with list of exercise done and data for each exercise |

---

## Integration Scenarios

### SDK Integration

The MyWellness SDK manages the QR code scanning, cloud communication, and user interface components required for a seamless fitness experience. Authentication with the MyWellness cloud is handled securely through a dedicated server-to-server API integration at the end-user level.

The integration starts with user's data integration done using MWC API (please find the full documentation here: https://apidocs.mywellness.com) that allows to create the link between the user in the third party platform (membership SW or customer's platform) and the corresponding user in Mywellness cloud. Based on that, the SDK integration could be implemented in the customer's app using the UserID that it is shared between the 2 platform.

The diagram below shows the interactions between the third party SW (orange color marked) and Mywellness platform (green color marked):

### Server to Server Integration

Implement a fully backend-controlled integration where all MyWellness API interactions route through your server. Your server maintains the connection with MyWellness through dedicated server-to-server API endpoints.

The integration starts with user's data integration done using MWC API (please find the full documentation here: https://apidocs.mywellness.com) that allows to create the link between the user in the third party platform (membership SW or customer's platform) and the corresponding user in Mywellness cloud. Based on that, the Server to server integration could be implemented in the customer's app calling the App Backend and using the UserID that it is shared between the 2 platform.

The diagram below shows the interactions between the third party SW (orange color marked) and Mywellness platform (green color marked):

---

## Basic Information

### Base URLs

**Development/Test Environment:**
```
https://enterprise-test.mywellness.com
```

**Production Environment:**
```
https://enterprise.mywellness.com/api
```

The development phase ends when the partner has completed the development and together with the Technogym Professional Service team the features are tested and marked as completed.

### Partner Credentials

For each partner we provide:

- **API key:** to be used in server to server (backend) calls setting the HTTP header `x-openplatform-apikey`
- **Authentication domain:** to be used in server to server (backend) calls setting the HTTP header `x-openplatform-authdomain`

### Supported Languages

The API manages the use of the HTTP Header `x-openplatform-language` (also the standard HTTP Header `Accept-Language` is accepted as fallback in case `x-openplatform-language` is not provided) in order to let the client to specify the preferred language (or specific culture) that is needed when the API returns localized contents (for example the name of a biometric parameter or the name of an exercise done). In case the header is not provided (or contains a not supported language or specific culture), the API will return the localized content using the language set on the user on mywellness cloud.

Supported languages:
- Italian (it)
- Spanish (es)
- Portuguese (pt-BR)
- English (en and en-GB)
- French (fr)

---

## Authentication

The app authentication is managed through a JWT token that is generated using an API key and Auth domain provided by Technogym.

The server to server API calls instead are authenticated using API key and Auth domain and so the JWT token is not required.

The JWT token provided in each call is verified using the data included in the token. The JWT token specifies a maximum of 10 hours expiration.

### JWT Token Responsibilities

The JWT token has 2 main responsibilities:

1. Assure that the caller is trusted and the signature is valid. The JWT token must respect the maximum of 10 hours expiration
2. Specify the partner id and data (auth domain and api key) in order to recognize the context of the execution of the operation

### JWT Structure

**Header:**
```json
{
  "alg": "ES256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "userId": "37a37f83-866e-418b-aa05-a0b88af357ed",
  "chainId": "f0f54a4d-0ad6-4f49-8b1a-cf20ce430611",
  "authDomain": "com.authdomain",
  "externalId": "test1233",
  "measurementSystem": "Metric",
  "culture": "en-EN",
  "iat": 1749226886,
  "exp": 1749262886
}
```

### Authorization Header

Each HTTP request done from a client (app) must include the Authorization header containing the JWT token as bearer token:

```
Authorization: Bearer JWT
```

---

## API Endpoints

### App Authentication

**Endpoint:** `GET {{baseUrl}}/v1/backend/user/{{user_id}}/app-token`

This endpoint allows to verify the validity of the JWT token provided in the Authorization header.

**Headers:**
- `x-openplatform-apikey: {{api_key}}`
- `x-openplatform-authdomain: {{auth_domain}}`
- `Content-Type: application/json`
- `Accept-Language: en`

**Example Request:**
```bash
curl --location -g '{{baseUrl}}/v1/backend/user/{{user_id}}/app-token' \
--header 'x-openplatform-apikey: {{api_key}}' \
--header 'x-openplatform-authdomain: {{auth_domain}}' \
--header 'Content-Type: application/json'
```

**Example Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzYjFhYjhlZC1mMDczLTRjOTctYTUyYi1kNGFhOTA1NDZkZWMiLCJjaGFpbklkIjoiZWZmZjNlMjctMTllYy00OTk5LWFmYWMtNWE3NmVjMjQxNjBjIiwiYXV0aERvbWFpbiI6ImJyLmNvbS5zbWFydGZpdCIsImV4dGVybmFsSWQiOiI5MTk5NDUxIiwibWVhc3VyZW1lbnRTeXN0ZW0iOiJNZXRyaWMiLCJjdWx0dXJlIjoicHQtQlIiLCJpYXQiOjE3NTMyNzk2MzksImV4cCI6MTc1MzMxNTYzOX0.uVq-I_LZMU0UY5-Lneopl-oGk396aW9qMYEjubvfiaNU2P9Oyji9PZJjWuxCmWtox8aCY6SraTe3tQNBWSEdBw"
}
```

---

### Facilities List

**Endpoint:** `GET {{baseUrl}}/v1/backend/facilities`

Retrieve the details of a training session done by the user using the API from the third party backend.

**Headers:**
- `x-openplatform-apikey: {{api_key}}`
- `x-openplatform-authdomain: {{auth_domain}}`
- `Content-Type: application/json`
- `Accept: application/json`

---

### Training Session Details

**Endpoint:** `GET {{baseUrl}}/v1/backend/user/{{user_id}}/workout-sessions/1`

**Example Request:**
```bash
curl --location -g '{{baseUrl}}/v1/backend/user/{{user_id}}/workout-sessions/1' \
--header 'x-openplatform-apikey: {{api_key}}' \
--header 'x-openplatform-authdomain: {{auth_domain}}' \
--header 'Content-Type: application/json' \
--header 'Accept: application/json'
```

**Example Response (200 OK):**
```json
{
  "id": "1",
  "title": "Workout 1",
  "startedOn": "2025-06-05T12:25:50.612+00:00",
  "closedOn": "2025-06-05T12:26:03.317+00:00",
  "pictureUrl": "https://cdnmedia.mywellness.com/training_program/wstp.jpg",
  "exercises": [
    {
      "equipmentName": "Run",
      "equipmentPictureUrl": "https://cdnmedia.mywellness.com/equipments/2bcb4159-7fa1-4379-8a36-36ba12ce84ea/images/e57.jpg",
      "name": "GOAL exercise in time",
      "doneCalories": "91",
      "doneDuration": "600",
      "doneMove": "159",
      "doneOn": "2025-06-05T12:25:54.6432599+00:00",
      "doneProperties": [
        {
          "physicalProperty": "Duration",
          "displayName": "Duration",
          "rawValue": "600",
          "formattedDisplayValue": "10:00",
          "formattedValue": "10:00 min",
          "unitOfMeasure": "Minute",
          "unitOfMeasureShortString": "min"
        },
        {
          "physicalProperty": "HDistance",
          "displayName": "Distance",
          "rawValue": "1016.666667",
          "formattedDisplayValue": "1.02",
          "formattedValue": "1.02 km",
          "unitOfMeasure": "Km",
          "unitOfMeasureShortString": "km"
        },
        {
          "physicalProperty": "AvgSpeed",
          "displayName": "Average speed",
          "rawValue": "6.1",
          "formattedDisplayValue": "6.1",
          "formattedValue": "6.1 km/h",
          "unitOfMeasure": "Km_h",
          "unitOfMeasureShortString": "km/h"
        },
        {
          "physicalProperty": "Calories",
          "displayName": "Calories",
          "rawValue": "90.853175",
          "formattedDisplayValue": "91",
          "formattedValue": "91 kcal",
          "unitOfMeasure": "Kcal",
          "unitOfMeasureShortString": "kcal"
        }
      ]
    }
  ]
}
```

---

### Equipment QR Code Login

**Endpoint:** `POST {{baseUrl}}/v1/backend/user/{{user_id}}/equipments/login`

Login on Technogym equipment using the API from the third party backend.

**Headers:**
- `x-openplatform-apikey: {{api_key}}`
- `x-openplatform-authdomain: {{auth_domain}}`
- `Content-Type: application/json`
- `Accept: application/json`

**Request Body:**
```json
{
  "code": "http://services-test.mywellness.com/qractive?et=RTAzMEJSMDI0MDAwQU01fDMwN2Y4MzFiYjQ2YzRmNDc4Njg4NDdlNjZmYzVkNWY0fFRlY2hub2d5bUhlYWx0aFN0YXRpb258U2NyZWVuMTVfNnxBbmRyb2lkfEZhbHNlfDk5M3xkcmVhbWZpdGFsY29yY29ufDQwLjIwLjE4Ljh8UGxhdGZvcm1Vbml0eTV8fDB8MQ2.DF12443DDAB7D3925C0F9A57F6965E462EA0D78C"
}
```

**Example Response (200 OK):**
```json
{
  "name": "Technogym Checkup",
  "deviceType": "TechnogymHealthStation",
  "validData": true,
  "equipmentCode": 993,
  "imageUrl": "https://cmsmedia.mywellness.com/5bf51e0109ee93b5aef82c77/equipment/all/e993/e993.jpg",
  "isKiosk": false,
  "equipmentId": "7188bcc4-1d20-47c2-997c-597b7b9bea40",
  "facilityId": "e452c0b5-a9b6-4a49-ba10-7b61283bc5df"
}
```

---

### Wellness Age Results (App)

**Endpoint:** `GET {{baseUrl}}/v1/app/wellness-age`

Retrieve Technogym Checkup results using the API from the mobile application.

**Authorization:** Bearer Token

**Headers:**
- `Content-Type: application/json`
- `Accept: application/json`

**Example Response (200 OK):**
```json
{
  "wellnessAge": "39",
  "calculatedOn": "2025-07-23T13:36:51.013+00:00",
  "functionalAgeByCategory": [
    {
      "functionalAge": "38",
      "functionalScore": "56",
      "calculatedOn": "2025-07-23T10:25:09+00:00",
      "alert": false,
      "type": {
        "category": "BodyComposition",
        "name": "Composição corporal"
      }
    }
  ]
}
```

---

### Wellness Age Results (Backend)

**Endpoint:** `GET {{baseUrl}}/v1/backend/user/{{user_id}}/wellness-age`

Retrieve Technogym Checkup results using the API from the third party backend.

**Headers:**
- `x-openplatform-apikey: {{api_key}}`
- `x-openplatform-authdomain: {{auth_domain}}`
- `Content-Type: application/json`
- `Accept: application/json`

---

### User Current Workout (App)

**Endpoint:** `GET {{baseUrl}}/v1/app/workout/current`

**Authorization:** Bearer Token

**Headers:**
- `x-openplatform-language: en`
- `Accept: application/json`

**Example Response (200 OK):**
```json
{
  "workoutSession": {}
}
```

---

### User Current Workout (Backend)

**Endpoint:** `GET {{baseUrl}}/v1/backend/user/{{user_id}}/workout/current`

**Headers:**
- `x-openplatform-apikey: {{api_key}}`
- `x-openplatform-authdomain: {{auth_domain}}`
- `x-openplatform-language: en`
- `Accept: application/json`

**Example Response (200 OK):**
```json
{
  "workoutSession": {}
}
```

---

### Mark Exercise as Done (Backend)

**Endpoint:** `PUT {{baseUrl}}/v1/backend/user/{{user_id}}/workout/current/exercise/mark-as-done`

**Headers:**
- `x-openplatform-apikey: {{api_key}}`
- `x-openplatform-authdomain: {{auth_domain}}`
- `x-openplatform-language: en`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "idCr": 3256.9048543861777,
  "position": 3736.0146483244725
}
```

**Response (200 OK):** No response body

---

### Mark Exercise as Undone (App)

**Endpoint:** `PUT {{baseUrl}}/v1/app/workout/current/exercise/mark-as-undone`

**Authorization:** Bearer Token

**Headers:**
- `x-openplatform-language: en`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "idCr": 3256.9048543861777,
  "position": 3736.0146483244725
}
```

**Response (200 OK):** No response body

---

## Additional Resources

- **Full MWC API Documentation:** https://apidocs.mywellness.com
- **Technogym Developer Center:** https://developer.technogym.com
- **Enterprise API Documentation:** https://openplatformdocs.mywellness.com

---

# mywellness Cloud API Documentation

**Source:** mywellness cloud API Documentation
**Date Reviewed:** 15 December 2025

---

## Introduction

The mywellness cloud is an open platform that lets millions of people around the world track, measure and improve their health and fitness. The mywellness cloud API enables the exchange of select data in order to extend and augment the mywellness cloud user-experience and support complementary services in a collaborative wellness-ecosystem.

### Three Key Principles

Three key principles govern the use of the mywellness cloud API:

1. The data belongs to the user
2. We are stewards of the data and have an obligation to protect it and use it responsibly
3. Data can only be collected with explicit user permission

---

## Main Scenarios

mywellness cloud APIs cover two main scenarios, depending on the kind of integration a third party wants to achieve:

1. **Server to Server**
2. **Enduser to Enduser**

### Server to Server

The first one is mainly dedicated to those membership softwares which have to interact with our professional solution, in order to allow the facility operators to achieve the best customer experience. It doesn't require that the final user creates a mywellness account.

### Enduser to Enduser

The second addresses to those third parties websites which wants to connect their user's account with mywellness account users. Our solution gives this chance via OAUTH 2 protocol.

---

## Get Started

In order to start the development for an integration process, the very first thing a third party should understand is the kind of scenario it is most interested in, since the process to follow for dealing with these two scenarios is quite different.

Once the chosen scenario is clear, a request must be sent to **mywellnessintegration@technogym.com**, specifying for what scenario there is interest and providing some data useful for us to eventually setup a testing environment:

- Company name
- Email
- Web Site Address
- Name of the Software to integrate
- Reference person for integration (with related email)
- Purpose for the integration

**Note:** Without the above information won't be possible to proceed with the setup of the testing environment.

Shortly after this request, the mywellness cloud team will contact the third party to complete the registration.

Depending on the chosen scenario, at the end of this first stage the third party will be provided with the information needed to move on.

---

## RESTful API

API endpoints are designed as JSON (JavaScript Object Notation) RESTful web services exposed on https protocol. RESTful means that the service layer has no user session state.

mywellness cloud APIs don't follow a "pure" REST protocol in which all http operations are mapped to a specific CRUD operation, but follow this rule:

**All operations are accessible using an HTTP GET/POST operation** specifying the URL that represents the resource followed by the operation to be performed on that. If data are needed in order to complete or perform the requested operation, they are provided as JSON data in a post body request.

**Important:** The request content-type in a post operation must be always set as `"application/json"`.

---

## Response Representation

API response has a standard defined format that has two main root fields named `data` and `errors`. These fields are mutually exclusive, so only data or errors can be present.

### Response Format

```json
{
   "data" : {},
   "errors": [{}]
}
```

### Response Behavior

**When `data` is present:**
- Means that the API response is managed
- Inside the `data` property there will be the actual result of the call

**When `errors` are returned:**
- The array will list the kinds of errors occurred
