const express = require('express');

const server = express();



server.all('/', (req, res)=>{

   res.setHeader('Content-Type', 'text/html');

   res.write('<link href="https://fonts.googleapis.com/css?family=Roboto Condensed" rel="stylesheet"> <style> body {font-family: "Roboto Condensed";font-size: 22px;} <p>Hosting Active</p>');

   res.end();

})



function keepAlive(){
   const port = process.env.PORT || 3000;
   const listener = server.listen(port, () => {
       console.log(`[KeepAlive Server]: Web server listening on port ${port}`);
   });

   listener.on('error', (err) => {
       if (err.code === 'EADDRINUSE') {
           console.log(`[KeepAlive Server]: Port ${port} is in use; continuing without local web server.`);
       } else {
           console.log(`[KeepAlive Server Error]: ${err.message}`);
       }
   });
}



module.exports = keepAlive;
