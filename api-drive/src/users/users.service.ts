import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from './schemas/user.schema.js';
import { RegisterDto } from '../auth/dto/regiter.dto.js';
import { UserRole } from './utils/user-role.enum.js';
import { escapeRegex } from './utils/escape-regex.js';
import { ListUsersQueryDto, UserStatusFilter } from './dto/list-users-query.dto.js';
import { ActivityLogService } from '../activity-log/activity-log.service.js';
import { ActivityAction } from '../activity-log/utils/activity-action.enum.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly activityLogService: ActivityLogService,
  ) { }


  //* actorId: admin que crea la cuenta. Sin actorId es un auto-registro público y el actor es el propio usuario
  async createUser(registerDto: RegisterDto, assignedRole?: UserRole, actorId?: string) {
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

    await this.logUserEvent(
      actorId ?? savedUser._id.toString(),
      actorId ? ActivityAction.CREATE_USER : ActivityAction.REGISTER_USER,
      savedUser._id.toString(),
      savedUser.name,
      { email: savedUser.email, role: savedUser.role },
    );

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

    return users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    }));
  }


  async searchUsersForReports(query: string) {
    const q = query?.trim();
    if (!q || q.length < 2) return [];

    const regex = new RegExp(escapeRegex(q), 'i');

    const users = await this.userModel
      .find({ $or: [{ name: regex }, { email: regex }] })
      .select('_id name email isActive')
      .sort({ name: 1 })
      .limit(10)
      .lean()
      .exec();

    return users.map(u => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      isActive: u.isActive !== false,
    }));
  }

  //* Un usuario sin el campo isActive se considera activo
  async isUserActive(userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId)) return false;

    const user = await this.userModel
      .findById(userId)
      .select('isActive')
      .lean()
      .exec();

    return !!user && user.isActive !== false;
  }

  async listUsers(query: ListUsersQueryDto, currentUserId: string) {
    const { search, status = UserStatusFilter.ALL, page = 1, limit = 10 } = query;

    const filter: Record<string, any> = {};

    const term = search?.trim();
    if (term) {
      const regex = new RegExp(escapeRegex(term), 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    if (status === UserStatusFilter.ACTIVE) {
      filter.isActive = { $ne: false };
    } else if (status === UserStatusFilter.INACTIVE) {
      filter.isActive = false;
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('_id name email role isActive avatarUrl createdAt')
        .sort({ name: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      items: users.map(u => this.toAdminUserView(u, currentUserId)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async setUserStatus(userId: string, isActive: boolean, currentUserId: string) {
    //* Un admin no puede desactivarse a sí mismo 
    if (!isActive && userId === currentUserId) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }


    const previous = await this.userModel
      .findByIdAndUpdate(userId, { isActive }, { new: false })
      .select('_id name email role isActive avatarUrl createdAt')
      .lean()
      .exec();

    if (!previous) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const changed = (previous.isActive !== false) !== isActive;
    if (changed) {
      await this.logUserEvent(
        currentUserId,
        isActive ? ActivityAction.ACTIVATE_USER : ActivityAction.DEACTIVATE_USER,
        userId,
        previous.name,
        { email: previous.email, role: previous.role },
      );
    }

    return this.toAdminUserView({ ...previous, isActive }, currentUserId);
  }

  private logUserEvent(
    actorId: string,
    action: ActivityAction,
    targetUserId: string,
    targetUserName: string,
    details: Record<string, any>,
  ) {
    return this.activityLogService.tryLogEvent(actorId, action, targetUserId, 'USER', targetUserName, details);
  }

  private toAdminUserView(u: any, currentUserId: string) {
    return {
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive !== false,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      isCurrentUser: u._id.toString() === currentUserId,
    };
  }
}
