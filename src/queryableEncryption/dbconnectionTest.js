import mongoose from "mongoose";

// Replace the following with your MongoDB replica set connection details
const mongoDBUrl = 'mongodb://mongo1:27017,mongo2:27018,mongo3:27019/myReplicaSet';

mongoose.connect(mongoDBUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB replica set');
    
    // Add your test logic here

    // Close the connection when done (optional)
    // mongoose.connection.close();
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });
