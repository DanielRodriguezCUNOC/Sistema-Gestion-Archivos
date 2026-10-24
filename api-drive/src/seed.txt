import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { getConnectionToken, getModelToken } from "@nestjs/mongoose";
import { Model } from 'mongoose';
import type { Connection, Types } from 'mongoose';
import { GridFSBucket } from "mongodb";
import * as bcrypt from 'bcrypt';
import { ActivityLog } from "./activity-log/schemas/activity-log.schema.js";
import { Folder } from "./folders/schemas/folder.schema.js";
import { User } from "./users/schemas/user.schema.js";
import { ActivityAction } from "./activity-log/utils/activity-action.enum.js";
import { UserRole } from "./users/utils/user-role.enum.js";

async function bootstrap() {

  console.log('Iniciando proceso de seed de la base de datos...');

  const app = await NestFactory.createApplicationContext(AppModule)

  const connection = app.get<Connection>(getConnectionToken());
  const userModel = app.get<Model<User>>(getModelToken(User.name));
  const folderModel = app.get<Model<Folder>>(getModelToken(Folder.name));
  const activityLogModel = app.get<Model<ActivityLog>>(getModelToken(ActivityLog.name));

  const bucket = new GridFSBucket(connection.db!, { bucketName: 'uploads' });

  console.log('Limpiando base de datos...');
  await userModel.deleteMany({});
  await folderModel.deleteMany({});
  await activityLogModel.deleteMany({});
  await connection.db?.collection('uploads.files').deleteMany({});
  await connection.db?.collection('uploads.chunks').deleteMany({});
  await connection.db?.collection('fs.files').deleteMany({});
  await connection.db?.collection('fs.chunks').deleteMany({});

  console.log('Creando usuarios...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  const users = await userModel.insertMany([
    { name: 'Admin', email: 'admin@test.com', password: passwordHash, role: UserRole.ADMIN, isActive: true, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin' },
    { name: 'Juan Perez', email: 'juan@test.com', password: passwordHash, role: UserRole.USER, isActive: true, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Juan' },
    { name: 'Maria Gomez', email: 'maria@test.com', password: passwordHash, role: UserRole.USER, isActive: true, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Maria' },
  ]);

  console.log('Creando estructura de carpetas, comparticiones y papelera...');

  const rootFolderJuan = await folderModel.create({ name: 'Documentos Juan', owner: users[1]._id, parentFolderId: null });
  const subFolderJuan = await folderModel.create({
    name: 'Proyectos 2026',
    owner: users[1]._id,
    parentFolderId: rootFolderJuan._id,
    sharedWith: [{ userId: users[2]._id, permission: 'write' }],
  });

  const rootFolderMaria = await folderModel.create({ name: 'Documentos Maria', owner: users[2]._id, parentFolderId: null });
  const subFolderMaria = await folderModel.create({
    name: 'Investigaciones',
    owner: users[2]._id,
    parentFolderId: rootFolderMaria._id,
    sharedWith: [{ userId: users[1]._id, permission: 'read' }],
  });

  await folderModel.create({
    name: 'Archivos Viejos', owner: users[2]._id, parentFolderId: null, isTrash: true, deletedAt: new Date(),
  });

  console.log('Creando archivos...');
  const fileExtensions = ['.txt', '.md'];

  for (let i = 1; i <= 50; i++) {
    let folderId: Types.ObjectId | null = null;
    let fileOwner = users[i % 3 === 0 ? 0 : i % 3];

    if (i <= 8) {
      folderId = null;
      fileOwner = i % 2 === 0 ? users[1] : users[2];
    } else if (i <= 22) {
      folderId = rootFolderJuan._id as Types.ObjectId;
      fileOwner = users[1];
    } else if (i <= 32) {
      folderId = subFolderJuan._id as Types.ObjectId;
      fileOwner = users[1];
    } else if (i <= 42) {
      folderId = rootFolderMaria._id as Types.ObjectId;
      fileOwner = users[2];
    } else {
      folderId = subFolderMaria._id as Types.ObjectId;
      fileOwner = users[2];
    }

    const isTrash = i > 47;
    const dummyContent = Buffer.from(`Contenido del archivo ${i} de ${fileOwner.name}`);
    const ext = fileExtensions[i % fileExtensions.length];
    const filename = `archivo_prueba_${i}${ext}`;

    const sharedWith = [];

    // Archivos de Juan compartidos con María
    if (fileOwner._id.toString() === users[1]._id.toString() && i % 3 === 0) {
      sharedWith.push({ userId: users[2]._id, permission: 'read' });
    }

    // Archivos de María compartidos con Juan
    if (fileOwner._id.toString() === users[2]._id.toString() && i % 3 === 1) {
      sharedWith.push({ userId: users[1]._id, permission: 'read' });
    }

    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        owner: fileOwner._id,
        contentType: ext === '.txt' ? 'text/plain' : 'text/markdown',
        version: 1,
        isTrash,
        sharedWith,
        folderId,
      },
    });

    uploadStream.end(dummyContent);
    await new Promise((resolve) => uploadStream.on('finish', resolve));

    await activityLogModel.create({
      userId: fileOwner._id,
      action: ActivityAction.UPLOAD_FILE,
      resourceId: uploadStream.id,
      resourceType: 'FILE',
      resourceName: filename,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000000000)),
    });
  }

  console.log('Generando logs de compartición...');
  for (let i = 0; i < 20; i++) {
    await activityLogModel.create({
      userId: users[1]._id,
      action: ActivityAction.SHARE_RESOURCE,
      resourceId: subFolderJuan._id,
      resourceType: 'FOLDER',
      resourceName: 'Proyectos 2026',
      details: { targetUserId: users[2]._id, permission: 'write' },
    });
  }

  console.log('Seeding completado exitosamente.');
  await app.close();
}

bootstrap().catch((error) => {
  console.error('Error durante el proceso de seed:', error);
  process.exit(1);
});