import { Injectable, inject } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';
import { CreateCategoryDto, UpdateCategoryDto, CATEGORY_ICONS, CATEGORY_COLOR_PRESETS } from '../models/category.model';

/**
 * Servicio para mostrar diálogos relacionados con categorías
 * Encapsula la lógica de interacción con el usuario usando AlertController
 */
@Injectable({
  providedIn: 'root'
})
export class CategoryDialogService {
  private readonly alertController = inject(AlertController);

  /**
   * Muestra un diálogo para crear una nueva categoría
   * @returns Los datos de la categoría o null si se canceló
   */
  async showCreateCategoryDialog(): Promise<CreateCategoryDto | null> {
    const alert = await this.alertController.create({
      header: 'Nueva Categoría',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Nombre de la categoría',
          attributes: {
            maxlength: 50
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Crear',
          role: 'confirm'
        }
      ]
    });

    await alert.present();
    const result = await alert.onDidDismiss();

    if (result.role === 'confirm' && result.data?.values?.name?.trim()) {
      // Usar un preset aleatorio de colores
      const randomPreset = CATEGORY_COLOR_PRESETS[
        Math.floor(Math.random() * CATEGORY_COLOR_PRESETS.length)
      ];
      
      // Usar un ícono aleatorio
      const randomIcon = CATEGORY_ICONS[
        Math.floor(Math.random() * CATEGORY_ICONS.length)
      ];

      return {
        name: result.data.values.name.trim(),
        color: randomPreset.color,
        backgroundColor: randomPreset.backgroundColor,
        icon: randomIcon
      };
    }

    return null;
  }

  /**
   * Muestra un diálogo para editar una categoría existente
   * Primero permite editar el nombre, luego opcionalmente cambiar el ícono
   * @param currentName Nombre actual de la categoría
   * @param currentIcon Ícono actual de la categoría
   * @param currentColor Color actual de la categoría
   * @param currentBackgroundColor Color de fondo actual
   * @returns Los datos actualizados o null si se canceló
   */
  async showEditCategoryDialog(
    currentName: string,
    currentIcon?: string,
    currentColor?: string,
    currentBackgroundColor?: string
  ): Promise<Partial<UpdateCategoryDto> | null> {
    // Paso 1: Editar nombre
    const nameAlert = await this.alertController.create({
      header: 'Editar Nombre',
      message: 'Cambia el nombre de tu categoría',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Nombre de la categoría',
          value: currentName,
          attributes: {
            maxlength: 50
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Siguiente',
          role: 'confirm'
        }
      ]
    });

    await nameAlert.present();
    const nameResult = await nameAlert.onDidDismiss();

    if (nameResult.role !== 'confirm') {
      return null;
    }

    const newName = nameResult.data?.values?.name?.trim();
    if (!newName) {
      return null;
    }

    // Paso 2: Preguntar si desea cambiar el ícono
    const changeIconAlert = await this.alertController.create({
      header: 'Cambiar Ícono',
      message: '¿Deseas cambiar el ícono y color de la categoría?',
      buttons: [
        {
          text: 'No, Solo Nombre',
          role: 'cancel',
          handler: () => {
            return { onlyName: true };
          }
        },
        {
          text: 'Sí, Cambiar',
          role: 'confirm'
        }
      ]
    });

    await changeIconAlert.present();
    const changeIconResult = await changeIconAlert.onDidDismiss();

    // Si solo quiere cambiar el nombre
    if (changeIconResult.role === 'cancel' || changeIconResult.data?.values?.onlyName) {
      return {
        name: newName
      };
    }

    // Paso 3: Generar nuevos ícono y color aleatorios
    const randomPreset = CATEGORY_COLOR_PRESETS[
      Math.floor(Math.random() * CATEGORY_COLOR_PRESETS.length)
    ];
    
    const randomIcon = CATEGORY_ICONS[
      Math.floor(Math.random() * CATEGORY_ICONS.length)
    ];

    return {
      name: newName,
      icon: randomIcon,
      color: randomPreset.color,
      backgroundColor: randomPreset.backgroundColor
    };
  }

  /**
   * Muestra un diálogo de confirmación para eliminar una categoría
   * @param categoryName Nombre de la categoría a eliminar
   * @param taskCount Número de tareas en la categoría
   * @returns true si se confirmó la eliminación, false en caso contrario
   */
  async showDeleteCategoryConfirmation(categoryName: string, taskCount: number = 0): Promise<boolean> {
    let message = `¿Estás seguro de que deseas eliminar la categoría "${categoryName}"?`;
    
    if (taskCount > 0) {
      message += `\n\nEsta categoría contiene ${taskCount} ${taskCount === 1 ? 'tarea' : 'tareas'}.`;
    }

    const alert = await this.alertController.create({
      header: 'Eliminar Categoría',
      message,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          cssClass: 'alert-button-destructive'
        }
      ],
      cssClass: 'category-delete-alert'
    });

    await alert.present();
    const result = await alert.onDidDismiss();

    return result.role === 'destructive';
  }

  /**
   * Muestra un mensaje de error
   * @param message Mensaje de error a mostrar
   */
  async showErrorAlert(message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Error',
      message,
      buttons: ['OK']
    });

    await alert.present();
  }
}
