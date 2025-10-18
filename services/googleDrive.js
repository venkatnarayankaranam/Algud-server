const { google } = require('googleapis')
const stream = require('stream')

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
)

oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

const drive = google.drive({ version: 'v3', auth: oauth2Client })

async function uploadBufferToDrive(buffer, filename, mimeType) {
  // Create a readable stream from the buffer
  const bufferStream = new stream.PassThrough()
  bufferStream.end(buffer)

  // Upload file
  const res = await drive.files.create({
    requestBody: {
      name: filename,
      mimeType,
      // Put files in a folder if needed: parents: ['your-folder-id']
    },
    media: {
      mimeType,
      body: bufferStream
    },
    fields: 'id, name'
  })

  const fileId = res.data.id

  // Make the file public
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone'
    }
  })

  // Get the public URL
  const result = await drive.files.get({
    fileId,
    fields: 'webViewLink, webContentLink'
  })

  return {
    id: fileId,
    webViewLink: result.data.webViewLink,
    webContentLink: result.data.webContentLink
  }
}

module.exports = { uploadBufferToDrive }
