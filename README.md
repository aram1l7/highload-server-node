# User Balance Update Service

This service provides an endpoint for updating user balances. It handles requests for balance updates and checks for sufficient funds before applying the change. The service also includes load testing to simulate multiple requests.

## Table of Contents

1. [Installation](#installation)
2. [Environment Variables](#environment-variables)
3. [Running the Service](#running-the-service)
5. [Load Testing](#load-testing)


## 🛠 Installation & Setup
### 1️⃣ **Clone the Repository**
```sh
git clone https://github.com/aram1l7/highload-server-node
cd highload-server-node
```

### 2️⃣ **Install Dependencies**
```sh
npm install
npm install -g k6 pm2
```

## Environment Variables

Before running the service, ensure that the following environment variables are set. You can create a `.env` file in the root of your project and add these variables there.

```bash
DATABASE_URL=your_database_connectionstring  # The URL to connect to your PostgreSQL database
NODE_ENV=development            # Set to "production" for production environment
DB_USER=youruser
DB_PASSWORD=yourpass
DB_NAME=yourdb
DB_HOST=yourhost
```



## Running the service

Once the environment variables are set and dependencies are installed, you can run the service:

```bash
npm start
```

This will start the service on the port 4000.
You can now send POST requests to the /update-balance endpoint:

```bash
POST http://localhost:4000/update-balance
Content-Type: application/json
{
  "userId": 467,
  "amount": -2
}
```

## Testing

You can run the tests to ensure that everything is working correctly. The tests use the k6 tool to simulate multiple requests.

Running Tests with K6
To run the tests, you will need to have K6 installed. If you don't have it installed, follow the instructions here to install K6.

Once K6 is installed, run the following command to execute the test script:

```bash
  npm run load-test
```

Expected Results:
The test should run 10,000 requests with 100 virtual users.
50% of the requests should succeed (status 200), while 50% should fail with a 400 error indicating insufficient funds.