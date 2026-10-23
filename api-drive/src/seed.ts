import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { getConnectionToken, getModelToken } from "@nestjs/mongoose";
import { Connection, Model } from "mongoose";
import { GridFSBucket } from "mongodb";
import * as bcrypt from 'bcrypt';
import { ActivityLog } from "./activity-log/schemas/activity-log.schema.js";
import { Folder } from "./folders/schemas/folder.schema.js";
import { User } from "./users/schemas/user.schema.js";
import { ActivityAction } from "./activity-log/utils/activity-action.enum.js";

async function bootstrap() {

  console.log('Iniciando proceso de seed de la base de datos...');

  //* Levantar NestJS
  const app = await NestFactory.createApplicationContext(AppModule)

  //* Obetener modelos y conexion\
  const connection = app.get<Connection>(getConnectionToken());
  const userModel = app.get<Model<User>>(getModelToken(User.name));
  const folderModel = app.get<Model<Folder>>(getModelToken(Folder.name));
  const activityLogModel = app.get<Model<ActivityLog>>(getModelToken(ActivityLog.name));
  const bucket = new GridFSBucket(connection.db!)

  //* Limpiar DB
  console.log('Limpiando base de datos...');
  await userModel.deleteMany({});
  await folderModel.deleteMany({});
  await activityLogModel.deleteMany({});
  await connection.db?.collection('uploads.files').deleteMany({});
  await connection.db?.collection('uploads.chunks').deleteMany({});

  //* Creaer usuarios
  console.log('Creando usuarios...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const users = await userModel.insertMany([
    { name: 'Admin', email: 'admin@test.com', password: passwordHash, role: 'ADMIN', isActive: true, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin' },
    { name: 'Juan Perez', email: 'juan@test.com', password: passwordHash, role: 'USER', isActive: true, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Juan' },
    { name: 'Maria Gomez', email: 'maria@test.com', password: passwordHash, role: 'USER', isActive: true, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Maria' },
  ]);

  //* Crear estructura de carpetas, comparticiones y papelera
  console.log('Creando estructura de carpetas, comparticiones y papelera...');
  const rootFolderJuan = await folderModel.create({ name: 'Documentos Juan', owner: users[1]._id, parentFolderId: null });
  const subFolderJuan = await folderModel.create({
    name: 'Proyectos 2026',
    owner: users[1]._id,
    parentFolderId: rootFolderJuan._id,
    sharedWith: [{ userId: users[2]._id, permission: 'edit' }]
  });
  const trashFolder = await folderModel.create({
    name: 'Archivos Viejos', owner: users[2]._id, parentFolderId: null, isTrash: true, deletedAt: new Date()
  });

  //* Crear archivos
  console.log('Creando archivos...');
  const fileExtensions = ['.txt', '.md']
  let shareCount = 0

  for (let i = 1; i <= 50; i++) {
    const owner = users[i % 3];
    const isTrash = i > 45;

    //* Generar contenido en los archivos
    const dummyContent = Buffer.from(`Contenido del archivo ${i} de ${owner.name}`);
    const ext = fileExtensions[i % fileExtensions.length];
    const filename = `archivo_prueba_${i}${ext}`;

    //* Simular comparticion
    const sharedWith = [];
    if (shareCount < 25 && owner._id.toString() !== users[1]._id.toString()) {
      sharedWith.push({ userId: users[1]._id, permission: 'read' });
      shareCount++;
    }


    //* Subir a GridFS
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        owner: owner._id,
        contentType: ext === '.txt' ? 'text/plain' : 'text/markdown',
        version: 1,
        isTrash,
        sharedWith,
      },
    });
    uploadStream.end(dummyContent);
    await new Promise((resolve) => uploadStream.on('finish', resolve));

    //* Crear Logs de actividad por archivo
    await activityLogModel.create({
      userId: owner._id,
      action: ActivityAction.UPLOAD_FILE,
      resourceId: uploadStream.id,
      resourceType: 'FILE',
      resourceName: filename,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000000000)),
    })

    //* Generar logs de compartición
    for (let i = 0; i < 20; i++) {
      await activityLogModel.create({
        userId: users[1]._id,
        action: ActivityAction.SHARE_RESOURCE,
        resourceId: subFolderJuan._id,
        resourceType: 'FOLDER',
        resourceName: 'Proyectos 2026',
        details: { targetUserId: users[2]._id, permission: 'edit' }
      });
    }

    console.log('Seeding completado exitosamente.');
    await app.close();
    process.exit(0);
  }

  bootstrap().catch((error) => {
    console.error('Error durante el proceso de seed:', error);
    process.exit(1);
  });

}
