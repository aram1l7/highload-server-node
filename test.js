const http = require("k6/http");
const { check } = require("k6");

const options = {
  vus: 100,
  iterations: 10000,
  duration: "1m",
};

function testBalanceUpdate() {
  const url = "http://localhost:4000/update-balance";
  const payload = JSON.stringify(
    { 
      userId: 502, // change the id to userId you want to test on
      amount: -2 
    });

  const params = {
    headers: { "Content-Type": "application/json" },
  };

  const response = http.post(url, payload, params);

  console.log("Response status:", response.status);
  console.log("Response body:", response.body);

  check(response, {
    "✅ Success (200) for valid withdrawals": (r) => r.status === 200,
    "❌ Error (400) for insufficient funds": (r) =>
      r.status === 400 && r.json().error === "Insufficient funds",
  });
}

module.exports = {
  options,
  default: testBalanceUpdate,
};
