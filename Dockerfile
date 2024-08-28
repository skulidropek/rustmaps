# Используем официальный Node.js образ в качестве базового
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы проекта
COPY . .

# Сборка проекта
RUN npm run build

# Указываем порт, который будет открыт
EXPOSE 3000

# Команда для запуска приложения
CMD ["npm", "start"]
