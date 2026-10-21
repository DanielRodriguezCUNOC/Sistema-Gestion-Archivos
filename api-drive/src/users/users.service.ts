import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from './schemas/user.schema.js';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) { }

  async searchUsersForSharing(query: string, currentUserId: string) {
    // Evitar procesar búsquedas vacías o muy cortas
    if (!query || query.trim().length < 2) {
      return [];
    }

    const currentObjectId = new Types.ObjectId(currentUserId);
    const regex = new RegExp(query.trim(), 'i'); // 'i' para ignorar mayúsculas/minúsculas

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