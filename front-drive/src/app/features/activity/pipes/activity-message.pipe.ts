import { Pipe, PipeTransform } from '@angular/core';
import { ActivityLogItem } from '../../models/activity-log.model';

@Pipe({ name: 'activityMessage' })
export class ActivityMessagePipe implements PipeTransform {
  transform(log: ActivityLogItem): string {
    const actor = log.userId?.name || 'Usuario';
    const resource = log.resourceName || 'recurso';

    switch (log.action) {
      case 'UPLOAD_FILE': return `${actor} subio el archivo ${resource}`;
      case 'RENAME_FILE': return `${actor} renombro el archivo ${resource}`;
      case 'RENAME_FOLDER': return `${actor} renombro la carpeta ${resource}`;
      case 'MOVE_FILE': return `${actor} movio el archivo ${resource}`;
      case 'UPDATE_FILE': return `${actor} edito el archivo ${resource}`;
      case 'DELETE_FILE': return `${actor} envio a papelera el archivo ${resource}`;
      case 'DELETE_FOLDER': return `${actor} envio a papelera la carpeta ${resource}`;
      case 'RESTORE_FILE': return `${actor} restauro el archivo ${resource}`;
      case 'RESTORE_FOLDER': return `${actor} restauro la carpeta ${resource}`;
      case 'HARD_DELETE_FILE': return `${actor} elimino definitivamente el archivo ${resource}`;
      case 'HARD_DELETE_FOLDER': return `${actor} elimino definitivamente la carpeta ${resource}`;
      case 'SHARE_RESOURCE':
        return `${actor} compartio ${log.resourceType === 'FILE' ? 'el archivo' : 'la carpeta'} ${resource}`;
      case 'REVOKE_SHARE': return `${actor} revoco permisos sobre ${resource}`;
      case 'CREATE_FOLDER': return `${actor} creo la carpeta ${resource}`;
      case 'CREATE_USER': return `${actor} creo al usuario ${resource}`;
      case 'ACTIVATE_USER': return `${actor} activo al usuario ${resource}`;
      case 'DEACTIVATE_USER': return `${actor} desactivo al usuario ${resource}`;
      case 'REGISTER_USER': return `${actor} se registro en el sistema`;
      case 'LOGIN': return `${actor} inicio sesion`;
      case 'LOGIN_FAILED': return `Intento fallido de inicio de sesion en la cuenta de ${actor}`;
      case 'LOGOUT': return `${actor} cerro sesion`;
      case 'VIEW_FILE': return `${actor} abrio el archivo ${resource}`;
      case 'DOWNLOAD_FILE': return `${actor} descargo el archivo ${resource}`;
      default: return `${actor} realizo ${log.action} en ${resource}`;
    }
  }
}