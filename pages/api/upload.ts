import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files } from 'formidable';
import fs from 'fs';
import path from 'path';
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

    const chunkIndexNum = parseInt(chunkIndex, 10);
    const totalChunksNum = parseInt(totalChunks, 10);
    const uploadDir = path.join(process.cwd(), '/uploads');
    const tempFilePath = path.join(uploadDir, `${fileName}.part`);

    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
      }

      // Сохранение текущего chunk'а в файл
      const data = fs.readFileSync(file.filepath);
      fs.appendFileSync(tempFilePath, data);
      fs.unlinkSync(file.filepath); // Удаление временного файла

      if (chunkIndexNum === totalChunksNum - 1) {
        // Если это последний chunk, переименовываем файл в окончательное имя
        const finalFilePath = path.join(uploadDir, fileName);
        fs.renameSync(tempFilePath, finalFilePath);

        // Загружаем файл на внешнее API
        const fileStream = fs.createReadStream(finalFilePath);
        const uploadUrl = await uploadMapImplAsync(fileStream, fileName);

        if (uploadUrl) {
          console.log("Map successfully uploaded:", uploadUrl);
          res.status(200).json({ url: uploadUrl }); // Возвращаем URL, который прислал внешний API
        } else {
          console.error("Failed to upload map to external API");
          res.status(500).json({ error: 'Failed to upload map to external API' });
        }
      } else {
        res.status(200).json({ message: `Chunk ${chunkIndexNum + 1} of ${totalChunksNum} uploaded successfully` });
      }
    } catch (error) {
      console.error('Error handling chunk:', error);
      res.status(500).json({ error: 'Error handling chunk' });
    }
  });
}

async function uploadMapImplAsync(fileStream: fs.ReadStream, mapFileName: string): Promise<string | null> {
  const requestUri = `https://api.facepunch.com/api/public/rust-map-upload/${mapFileName}`;
  let retries = 0;

  while (retries < 10) {
    try {
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
