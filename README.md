# Lobby Proto - Gaming Lobby CMS

A full-stack React application for managing gaming lobby categories and content with advanced targeting capabilities.

## 🎯 Project Overview

**Lobby Proto** is a content management system designed for gaming platforms to manage lobby categories, subcategories, and navigation structures. It features a dual-interface system with a CMS for content editors and a lobby interface for end users.

### Key Features
- **Multi-brand Support**: Manage multiple gaming brands from one interface
- **Advanced Targeting**: Filter content by device, country, player segment, and individual player IDs
- **Global Templates**: Create reusable category templates across brands
- **Multi-locale Support**: Full internationalization with locale-specific content
- **Real-time Preview**: See changes instantly in the lobby interface
- **PostgreSQL Integration**: Persistent data storage with Docker deployment

## 🏗️ Architecture

### Frontend
- **React 18** with Vite for fast development
- **React Router** for client-side routing
- **Context API** for state management
- **CSS-in-JS** styling approach

### Backend
- **Node.js/Express** API server
- **PostgreSQL** database with Docker
- **RESTful API** design

### Deployment
- **Docker** containerization
- **AWS Lightsail** cloud deployment
- **Multi-stage builds** for optimization

## 📁 Project Structure

```
lobby-proto/
├── src/
│   ├── cms/                    # CMS Interface
│   │   ├── CmsApp.jsx         # Main CMS application
│   │   ├── CmsContext.jsx     # State management & API
│   │   ├── CategoryEditor.jsx # Category editing interface
│   │   ├── TargetingEditor.jsx # Targeting rules interface
│   │   └── targeting.js       # Targeting utilities
│   ├── lobby/                 # Lobby Interface
│   │   ├── LobbyApp.jsx       # Main lobby application
│   │   ├── TargetingContext.jsx # Targeting simulation
│   │   └── TargetingSimulator.jsx # Testing interface
│   ├── shared/                # Shared Components
│   │   └── Icon.jsx           # Icon component
│   └── App.jsx                # Root application
├── server/
│   └── index.js               # Express API server
├── docker-compose.yml         # Local development setup
├── Dockerfile                 # Production container
├── lightsail-deployment.json  # AWS deployment config
├── lobby_data.sql            # Database seed data
└── deploy.sh                 # Deployment script
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ 
- **Docker** & Docker Compose
- **Git**

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lobby-proto
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up --build
   ```

4. **Access the applications**
   - **CMS Interface**: http://localhost:3000/cms
   - **Lobby Interface**: http://localhost:3000
   - **Database**: PostgreSQL on port 5432

### Manual Setup (Alternative)

1. **Start PostgreSQL**
   ```bash
   docker run -d --name lobby-db \
     -e POSTGRES_DB=lobby_cms \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=password \
     -p 5432:5432 postgres:15
   ```

2. **Import seed data**
   ```bash
   docker exec -i lobby-db psql -U postgres -d lobby_cms < lobby_data.sql
   ```

3. **Start the application**
   ```bash
   npm run dev
   ```

## 🎮 Usage Guide

### CMS Interface (`/cms`)
- **Brands**: Manage multiple gaming brands
- **Categories**: Create hierarchical category structures
- **Global Templates**: Define reusable category templates
- **Targeting**: Set device, country, and player-specific rules
- **Localization**: Manage content in multiple languages

### Lobby Interface (`/`)
- **Navigation**: Browse categories and subcategories
- **Targeting Simulation**: Test targeting rules in real-time
- **Multi-locale**: Switch between supported languages
- **Responsive Design**: Works on desktop and mobile

### Targeting System
Configure content visibility based on:
- **Devices**: Mobile, Desktop
- **Countries**: UK, Ireland, Austria, Canada, Ontario, France
- **Player Segments**: VIP, Regular, New
- **Individual Players**: Specific player ID targeting
- **Internal Only**: Staff-only content

## 🔧 Development

### Key Technologies
- **Vite**: Fast development server and build tool
- **React Router**: Client-side routing
- **PostgreSQL**: Relational database
- **Docker**: Containerization
- **Express**: API server

### Database Schema
- **brands**: Gaming brand configurations
- **categories**: Hierarchical category structure
- **subcategories**: Content modules within categories
- **global_categories**: Reusable category templates
- **targeting**: Content visibility rules

### API Endpoints
- `GET /api/cms` - Fetch all CMS data
- `PUT /api/cms` - Update CMS data
- Database operations handled through Express middleware

## 🚢 Deployment

### Docker Build
```bash
# Build for production
docker build -t lobby-proto-app .

# Build for specific architecture (AWS Lightsail)
docker buildx build --platform linux/amd64 -t lobby-proto-app .
```

### AWS Lightsail Deployment

1. **Push to Docker Hub**
   ```bash
   docker tag lobby-proto-app:latest your-username/lobby-proto-app:latest
   docker push your-username/lobby-proto-app:latest
   ```

2. **Create Lightsail service**
   ```bash
   aws lightsail create-container-service \
     --service-name lobby-proto \
     --power small \
     --scale 1 \
     --region eu-west-2
   ```

3. **Deploy containers**
   ```bash
   aws lightsail create-container-service-deployment \
     --cli-input-json file://lightsail-deployment.json \
     --region eu-west-2
   ```

4. **Monitor deployment**
   ```bash
   aws lightsail get-container-services --service-name lobby-proto --region eu-west-2
   ```

### Quick Deployment Script
```bash
# Make executable and run
chmod +x deploy.sh
./deploy.sh v1.0
```

## 🔄 Data Management

### Backup Database
```bash
# Export current data
docker-compose exec db pg_dump -U postgres lobby_cms > lobby_data_backup.sql
```

### Restore Database
```bash
# Import data
docker-compose exec db psql -U postgres -d lobby_cms -f /docker-entrypoint-initdb.d/lobby_data.sql
```

### Reset Development Environment
```bash
# Clean Docker environment
docker-compose down -v
docker system prune -a --volumes

# Rebuild from scratch
docker-compose up --build
```

## 🛠️ Configuration

### Environment Variables
- `NODE_ENV`: Development/production mode
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default: 3000)

### Docker Configuration
- **Multi-stage build** for optimized production images
- **PostgreSQL 15** with persistent volumes
- **Health checks** for container monitoring

## 📊 Monitoring & Logs

### Local Development
```bash
# View application logs
docker-compose logs app

# View database logs
docker-compose logs db

# Follow logs in real-time
docker-compose logs -f
```

### Production (Lightsail)
```bash
# Check deployment status
aws lightsail get-container-services --service-name lobby-proto

# View application logs
aws lightsail get-container-log --service-name lobby-proto --container-name app
```

## 🤝 Contributing

1. Create feature branches from `main`
2. Keep branches short-lived (1-3 days)
3. Regularly sync with main to avoid conflicts
4. Use descriptive commit messages
5. Test locally with Docker before pushing

## 📝 License

This project is proprietary software for gaming platform management.

---

**Cost**: AWS Lightsail deployment costs ~$7-10/month for small-scale usage.