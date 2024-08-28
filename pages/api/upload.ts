import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files } from 'formidable';
import fs from 'fs';
import axios from 'axios';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function upload(req: NextApiRequest, res: NextApiResponse) {
  const form = formidable({
    keepExtensions: true,
  });

  form.parse(req, async (err: any, fields: Fields, files: Files) => {
    if (err) {
      console.error("Error parsing the form:", err);
      res.status(500).json({ error: 'Error uploading file' });
      return;
    }

    const file = Array.isArray(files.chunk) ? files.chunk[0] : files.chunk;
    const chunkIndex = Array.isArray(fields.chunkIndex) ? fields.chunkIndex[0] : fields.chunkIndex;
    const totalChunks = Array.isArray(fields.totalChunks) ? fields.totalChunks[0] : fields.totalChunks;
    const fileName = Array.isArray(fields.fileName) ? fields.fileName[0] : fields.fileName;

    if (!file || !chunkIndex || !totalChunks || !fileName) {
      res.status(400).json({ error: 'Missing required fields or file' });
      return;
    }

    try {
      // Стримим текущий chunk на внешний API
      const uploadUrl = await uploadMapChunkAsync(file.filepath, fileName);

      if (uploadUrl && parseInt(chunkIndex, 10) === parseInt(totalChunks, 10) - 1) {
        // Если это последний chunk, возвращаем URL
        res.status(200).json({ url: uploadUrl });
      } else if (uploadUrl) {
        // Возвращаем успех для текущего chunk'а
        res.status(200).json({ message: `Chunk ${parseInt(chunkIndex, 10) + 1} of ${totalChunks} uploaded successfully` });
      } else {
        console.error("Failed to upload chunk to external API");
        res.status(500).json({ error: 'Failed to upload chunk to external API' });
      }
    } catch (error) {
      console.error('Error handling chunk:', error);
      res.status(500).json({ error: 'Error handling chunk' });
    }
  });
}

async function uploadMapChunkAsync(filePath: string, mapFileName: string): Promise<string | null> {
  const requestUri = `https://api.facepunch.com/api/public/rust-map-upload/${mapFileName}`;
  let retries = 0;

  while (retries < 10) {
    try {
      const fileStream = fs.createReadStream(filePath);
      const response = await axios.put(requestUri, fileStream, {
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      if (response.status >= 200 && response.status < 300) {
        const responseBody = response.data;
        console.log('Received URL from external API:', responseBody);
        if (!responseBody || !responseBody.startsWith("http")) {
          throw new Error("Backend sent an invalid success response when uploading the map.");
        }
        return responseBody; // Возвращаем URL, который прислал внешний API
      } else if (response.status >= 400 && response.status < 500) {
        return null;
      } else {
        response.statusText;
      }
    } catch (error) {
      console.error(`Attempt ${retries + 1}: Upload failed with error:`, error);
      await new Promise(resolve => setTimeout(resolve, 1000 + retries * 5000));
      retries++;
    }
  }

  return null;
}
