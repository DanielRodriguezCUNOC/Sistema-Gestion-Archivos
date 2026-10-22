import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from './schemas/user.schema.js';
import { RegisterDto } from '../auth/dto/regiter.dto.js';
import { UserRole } from './utils/user-role.enum.js';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) { }


  async createUser(registerDto: RegisterDto, assignedRole?: UserRole) {
    const { name, email, password, role } = registerDto;

    //* Validar que el correo no esté registrado previamente
    const existingUser = await this.userModel.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    //* Encriptar contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    //* Determinar rol 
    const finalRole = assignedRole || role || UserRole.USER;

    //* Crear y guardar el usuario
    const newUser = new this.userModel({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: finalRole,
      isActive: true,
    });

    const savedUser = await newUser.save();

    return {
      id: savedUser._id.toString(),
      name: savedUser.name,
      email: savedUser.email,
      role: savedUser.role,
      avatarUrl: savedUser.avatarUrl,
      isActive: savedUser.isActive,
      createdAt: (savedUser as any).createdAt,
    };
  }

  async searchUsersForSharing(query: string, currentUserId: string) {

    if (!query || query.trim().length < 2) {
      return [];
    }

    const currentObjectId = new Types.ObjectId(currentUserId);
    const regex = new RegExp(query.trim(), 'i');

    const users = await this.userModel.find({
      _id: { $ne: currentObjectId }, //* Excluir al dueño del recurso
      isActive: { $ne: false },      //* Solo buscar usuarios activos
      $or: [
        { name: regex },
        { email: regex }
      ]
    })
      .select('_id name email') //* Solo los campos necesarios para la UI
      .limit(10) //* Limitar a 10 resultados 
      .exec();

    // Mapear para asegurar que el frontend reciba un formato limpio con 'id'
    return users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    }));
  }
}