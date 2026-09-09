# Docker Setup Guide for Hostel Management System

This project is fully containerized using Docker and Docker Compose.

## Services Included

1. **MongoDB Container (`mongodb`)**: Runs on port `27017` with persistent volume `mongo_data`.
2. **Backend Container (`backend`)**: Express + Prisma app running on port `3000`.
3. **Frontend Container (`frontend`)**: React + Vite built static assets served via Nginx reverse proxy on port `80` (also available on port `5173`).

---

## How to Run with Docker

### 1. Start all services
```bash
docker-compose up --build -d
```

### 2. View Logs
```bash
docker-compose logs -f
```

### 3. Stop all services
```bash
docker-compose down
```

### 4. Stop and remove volumes (clean database reset)
```bash
docker-compose down -v
```

---

## Access Points
- **Frontend App**: [http://localhost](http://localhost) or [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000/api](http://localhost:3000/api)
- **Health Check**: [http://localhost:3000/health](http://localhost:3000/health) or [http://localhost/health](http://localhost/health)
