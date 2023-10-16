import "dotenv/config";
import { MongoClient } from "mongodb";
import * as qeHelper from "./queryableEncryptionHelper.js";

async function runExample() {
  // start-setup-application-variables
  // KMS provider name should be one of the following: "aws", "gcp", "azure", "kmip" or "local"
  const kmsProviderName = "local";

  const uri = process.env.MONGODB_URI; // Your connection URI

  const keyVaultDatabaseName = "encryption";   //Key Vault Database Name
  const keyVaultCollectionName = "__keyVault";  //Key Vault Collection Name
  const keyVaultNamespace = `${keyVaultDatabaseName}.${keyVaultCollectionName}`;  //keyVault Namespace
  const encryptedDatabaseName = "medicalRecords";   //Encrypted Database Name
  const encryptedCollectionName = "patients";      // Encrypted Collection Name
  // end-setup-application-variables

  const kmsProviderCredentials =
    qeHelper.getKMSProviderCredentials(kmsProviderName);
  const customerMasterKeyCredentials =
    qeHelper.getCustomerMasterKeyCredentials(kmsProviderName);

    console.log({kmsProviderCredentials:kmsProviderCredentials});
    console.log({customerMasterKeyCredentials:customerMasterKeyCredentials});

  const autoEncryptionOptions = await qeHelper.getAutoEncryptionOptions(
    kmsProviderName,
    keyVaultNamespace,
    kmsProviderCredentials
  );

  console.log({autoEncryptionOptions:autoEncryptionOptions})

  // start-create-client
  const encryptedClient = new MongoClient(uri, {
    autoEncryption: autoEncryptionOptions,
  });
  // end-create-client

  await qeHelper.dropExistingCollection(encryptedClient, encryptedDatabaseName);
  await qeHelper.dropExistingCollection(encryptedClient, keyVaultDatabaseName);

  // start-encrypted-fields-map
  const encryptedFieldsMap = {
    encryptedFields: {
      fields: [
        {
          path: "patientRecord.ssn",
          bsonType: "string",
          queries: { queryType: "equality" },
        },
        {
          path: "patientRecord.billing",
          bsonType: "object",
        },
        {
          path: "patientRecord.clientId",
          bsonType: "string",
          queries: { queryType: "equality" },
        }
      ],
    },
  };
  // end-encrypted-fields-map

  const clientEncryption = qeHelper.getClientEncryption(
    encryptedClient,
    autoEncryptionOptions
  );

  await qeHelper.createEncryptedCollection(
    clientEncryption,
    encryptedClient.db(encryptedDatabaseName),
    encryptedCollectionName,
    kmsProviderName,
    encryptedFieldsMap,
    customerMasterKeyCredentials
  );

  // start-insert-document
  const patientDocument = {
    patientName: "Jon Doe",
    patientId: 12345678,
    patientRecord: {
      ssn: "987-65-4320",
      clientId: "CLIENT-ALPHA",
      billing: {
        type: "Visa",
        number: "4111111111111111",
      },
    },
  };

  const encryptedCollection = encryptedClient
    .db(encryptedDatabaseName)
    .collection(encryptedCollectionName);

  const result = await encryptedCollection.insertOne(patientDocument);
  // end-insert-document

  if (result.acknowledged) {
    console.log("Successfully inserted the patient document.");
  }

  // start-find-document
  console.log("Get patient records1");
  const findResult = await encryptedCollection.findOne({
    "patientRecord.ssn": "987-65-4320",
  });
  console.log(findResult);
  // end-find-document

  // start-find-document
  console.log("Get patient records2");
  const findResult2 = await encryptedCollection.findOne({
    "patientRecord.clientId": "CLIENT-ALPHA",
  });
  console.log(findResult2);
  // end-find-document

  await encryptedClient.close();
}

runExample().catch(console.dir);