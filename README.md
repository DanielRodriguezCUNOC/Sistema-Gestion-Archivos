# ☁️ Sistema de Gestión de Archivos

Esta aplicación permite a los usuarios subir, organizar, compartir y restaurar archivos y carpetas, simulando la experiencia de plataformas en la nube.

## 🛠️ Tecnologías Utilizadas

- **Frontend:** Angular 21
- **Backend:** NestJS (TypeScript) + Bun
- **Base de Datos:** MongoDB (GridFS para almacenamiento de archivos)
- **Infraestructura:** Docker & Docker Compose

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalados los siguientes programas en tu máquina:

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Para la base de datos)
2. [Bun](https://bun.sh/) (Entorno de ejecución hiper-rápido para el backend)
3. [Node.js y npm](https://nodejs.org/) (Para el entorno del frontend)
4. [Angular CLI](https://angular.dev/tools/cli) (Opcional pero recomendado: `npm install -g @angular/cli`)

---

## 🚀 Guía de Instalación y Arranque

El proyecto está dividido en dos partes principales: **Backend** (API) y **Frontend** (Cliente). Abre dos terminales para ejecutar ambos entornos.

### 1️⃣ Configuración del Backend (NestJS + MongoDB)

Dirígete a la carpeta del backend (por ejemplo, `api-drive`):

```bash
cd api-drive
```

**Instala las dependencias:**

```bash
bun install
```

**Paso A: Inicializar la base de datos por primera vez (⚠️ Solo la primera vez)**
Si acabas de clonar el proyecto, necesitas crear las colecciones y generar los datos de prueba. Ejecuta el script de reseteo:

```bash
./reset-db.sh
```

> _Nota: Este comando levanta la base de datos, limpia colecciones antiguas y ejecuta el seeder (`seed.ts`) para poblar archivos, usuarios y carpetas de prueba._

**Paso B: Arranque diario (Para el día a día)**
Una vez que la base de datos ya tiene información, usa este comando para tu trabajo diario. Levantará Docker de forma persistente y arrancará el servidor en modo desarrollo (`watch`):

```bash
./start.sh
```

La API estará disponible en `http://localhost:3000/api`.

---

### 2️⃣ Configuración del Frontend (Angular 21)

Abre una nueva terminal y dirígete a la carpeta del frontend (por ejemplo, `front-drive`):

```bash
cd front-drive
```

**Instala las dependencias:**

```bash
npm install
```

**Levanta el servidor de desarrollo de Angular:**

```bash
ng serve
```

El cliente de Angular estará disponible en `http://localhost:4200`. ¡Abre esa URL en tu navegador!

---

## 🔐 Usuarios de Prueba (Seeder)

Si ejecutaste el script `./reset-db.sh`, puedes iniciar sesión en el frontend con cualquiera de los siguientes usuarios precargados. Cada uno tiene sus propias carpetas, archivos y elementos compartidos:

| Usuario         | Correo           | Contraseña     | Rol     |
| :-------------- | :--------------- | :------------- | :------ |
| **Admin**       | `admin@test.com` | `Password123!` | `ADMIN` |
| **Juan Perez**  | `juan@test.com`  | `Password123!` | `USER`  |
| **Maria Gomez** | `maria@test.com` | `Password123!` | `USER`  |

---

## 🛑 Notas sobre Persistencia de Datos

Gracias a los volúmenes de Docker, **la base de datos es persistente**.

- Si detienes tu computadora o cancelas el proceso, tus archivos y cambios en el sistema se guardarán.
- Si necesitas **borrar todos los datos** y volver al estado inicial del sistema, simplemente vuelve a ejecutar `./reset-db.sh`.
