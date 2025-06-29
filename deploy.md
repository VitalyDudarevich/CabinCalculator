# Пошаговое развертывание на продакшене

## Срочное исправление (если у вас уже есть развернутый фронтенд)

### Шаг 1: Настройте бэкенд на Render

✅ **Бэкенд уже развернут на Render!**

Убедитесь, что настроены следующие переменные окружения в панели Render:

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/calculator
JWT_SECRET=some_random_secret_key_here
ALLOWED_ORIGINS=https://glass-calculator-bg.vercel.app
```

**Как добавить переменные в Render:**

1. Откройте ваш сервис в панели Render
2. Перейдите в "Environment"
3. Добавьте каждую переменную через "Add Environment Variable"
4. После добавления всех переменных нажмите "Manual Deploy" для пересборки

### Шаг 2: Настройте MongoDB Atlas

1. Перейдите на [MongoDB Atlas](https://cloud.mongodb.com/)
2. Создайте бесплатный кластер
3. В "Database Access" создайте пользователя
4. В "Network Access" добавьте `0.0.0.0/0` (разрешить все IP)
5. Получите connection string и замените в `MONGODB_URI` в Render

### Шаг 3: Обновите фронтенд в Vercel

1. Перейдите в настройки проекта на Vercel
2. В разделе "Environment Variables" добавьте:
   ```
   VITE_API_URL=https://ваш-render-url.onrender.com
   ```
3. Нажмите "Redeploy" для пересборки

**Найти URL Render:**

- В панели Render, в разделе вашего сервиса, скопируйте URL (обычно `https://your-app-name.onrender.com`)

## Альтернативные платформы

### Railway

1. Перейдите на [Railway.app](https://railway.app) и создайте аккаунт
2. Нажмите "New Project" → "Deploy from GitHub repo"
3. Выберите ваш репозиторий
4. В настройках проекта выберите "Settings" → "Source" → "Root Directory" → укажите `backend`
5. Добавьте переменные окружения в разделе "Variables":

```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/calculator
JWT_SECRET=some_random_secret_key_here
ALLOWED_ORIGINS=https://glass-calculator-bg.vercel.app
```

6. Railway автоматически развернет ваш бэкенд и даст вам URL

### Heroku

```bash
# Установите Heroku CLI
npm install -g heroku

# Войдите в аккаунт
heroku login

# Создайте приложение
heroku create your-app-name

# Настройте buildpack для Node.js
heroku buildpacks:set heroku/nodejs

# Добавьте переменные окружения
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_jwt_secret

# Разверните (из папки backend)
git subtree push --prefix backend heroku main
```

### DigitalOcean App Platform

1. Создайте аккаунт на DigitalOcean
2. Перейдите в "App Platform" → "Create App"
3. Подключите GitHub репозиторий
4. Выберите папку `backend` как source directory
5. Настройте переменные окружения
6. Разверните приложение

## Проверка работоспособности

После развертывания:

1. **Проверьте бэкенд**: откройте `https://your-render-url.onrender.com/health`
   Должен вернуть JSON с информацией о статусе

2. **Проверьте фронтенд**: откройте ваш Vercel сайт
   API запросы должны работать без ошибок

3. **Проверьте в браузере**: откройте DevTools → Network
   Все запросы к API должны возвращать 200 OK

## Частые проблемы

### "API недоступен"

- Убедитесь, что бэкенд развернут и отвечает на `/health`
- Проверьте правильность `VITE_API_URL` в Vercel
- **Render специфично**: первый запрос может быть медленным (холодный старт)

### "CORS errors"

- Убедитесь, что ваш домен Vercel добавлен в `ALLOWED_ORIGINS` в Render
- Проверьте logs бэкенда в панели Render

### "Database connection failed"

- Проверьте правильность `MONGODB_URI` в переменных Render
- Убедитесь, что IP Render разрешен в MongoDB Atlas (или используйте 0.0.0.0/0)

### "Build failed"

- Убедитесь, что все зависимости в `package.json`
- Проверьте logs сборки в панели Render
- **Render специфично**: убедитесь, что Build Command указывает на папку backend

### "Service keeps restarting"

- Проверьте logs в Render на ошибки
- Убедитесь, что все переменные окружения настроены
- Проверьте здоровье сервиса на `/health` endpoint
