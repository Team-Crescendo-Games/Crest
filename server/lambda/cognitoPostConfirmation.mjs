import https from "node:https";

export const handler = async (event) => {
  console.log("Cognito event:", JSON.stringify(event, null, 2));
  
  const postData = JSON.stringify({
    username: event.request.userAttributes['name'] || event.request.userAttributes['preferred_username'] || event.userName,
    cognitoId: event.request.userAttributes['sub'],
    email: event.request.userAttributes['email'],
  });

  const options = {
    hostname: "i819vkmz3d.execute-api.us-west-2.amazonaws.com",
    port: 443,
    path: "/prod/create-user",
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const responseBody = await new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      res.setEncoding("utf8");
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => resolve(body));
    });

    req.on('error', (e) => {
      console.error("Request error:", e);
      reject(e);
    });

    req.write(postData);
    req.end();
  });

  console.log("API Response:", responseBody);
  return event;
};
