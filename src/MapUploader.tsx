import axios from 'axios';

export class MapUploader {
    static async uploadMapAsync(file: File): Promise<string | null> { // Указываем тип File
        if (!file) {
            throw new Error('File is required.');
        }

        const mapFileName = file.name;
        const requestUri = `https://api.facepunch.com/api/public/rust-map-upload/${mapFileName}`;

        let retries = 0;

        while (retries < 10) {
            try {
                const response = await axios.put(requestUri, file, {
                    headers: {
                        'Content-Type': 'application/octet-stream',
                    },
                });

                if (response.status >= 200 && response.status < 300) {
                    const responseBody = response.data;
                    if (!responseBody || !responseBody.startsWith("http")) {
                        throw new Error("Backend sent an invalid success response when uploading the map.");
                    }
                    return responseBody;
                } else if (response.status >= 400 && response.status < 500) {
                    return null;
                }
            } catch (error) {
                await new Promise(resolve => setTimeout(resolve, 1000 + retries * 5000));
                retries++;
            }
        }

        return null;
    }
}
