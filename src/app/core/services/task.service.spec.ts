import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { Task } from '../models/task.model';

describe('TaskService', () => {
  let service: TaskService;
  let localStorageSpy: jasmine.SpyObj<Storage>;

  beforeEach(() => {
    // Mock localStorage
    localStorageSpy = jasmine.createSpyObj('localStorage', ['getItem', 'setItem', 'removeItem', 'clear']);
    
    // Reemplazar localStorage global
    Object.defineProperty(window, 'localStorage', {
      value: localStorageSpy,
      writable: true
    });

    TestBed.configureTestingModule({
      providers: [TaskService]
    });
    
    localStorageSpy.getItem.and.returnValue(null);
    service = TestBed.inject(TaskService);
  });

  afterEach(() => {
    localStorageSpy.clear.calls.reset();
  });

  it('debería ser creado', () => {
    expect(service).toBeTruthy();
  });

  describe('createTask', () => {
    it('debería crear una nueva tarea', () => {
      const description = 'Nueva tarea de prueba';
      const task = service.createTask({ description });

      expect(task).toBeDefined();
      expect(task.id).toBeTruthy();
      expect(task.description).toBe(description);
      expect(task.completed).toBe(false);
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('debería agregar la tarea a la lista', () => {
      const description = 'Nueva tarea';
      service.createTask({ description });

      const tasks = service.getTasks();
      expect(tasks.length).toBe(1);
      expect(tasks[0].description).toBe(description);
    });

    it('debería actualizar el signal de tareas', () => {
      service.createTask({ description: 'Tarea de prueba' });
      
      expect(service.tasks().length).toBe(1);
      expect(service.taskCount()).toBe(1);
      expect(service.pendingCount()).toBe(1);
      expect(service.completedCount()).toBe(0);
    });

    it('debería guardar en localStorage', () => {
      service.createTask({ description: 'Tarea de prueba' });
      
      expect(localStorageSpy.setItem).toHaveBeenCalled();
      const [key, value] = localStorageSpy.setItem.calls.mostRecent().args;
      expect(key).toBe('tasks');
      expect(JSON.parse(value).length).toBe(1);
    });
  });

  describe('updateTask', () => {
    it('debería actualizar la descripción de una tarea', () => {
      const task = service.createTask({ description: 'Tarea original' });
      const newDescription = 'Tarea actualizada';

      const updatedTask = service.updateTask(task.id, { description: newDescription });

      expect(updatedTask).toBeTruthy();
      expect(updatedTask?.description).toBe(newDescription);
      expect(service.tasks()[0].description).toBe(newDescription);
    });

    it('debería actualizar el estado de completado', () => {
      const task = service.createTask({ description: 'Tarea de prueba' });

      const updatedTask = service.updateTask(task.id, { completed: true });

      expect(updatedTask?.completed).toBe(true);
      expect(service.completedCount()).toBe(1);
      expect(service.pendingCount()).toBe(0);
    });

    it('debería retornar null si la tarea no existe', () => {
      const result = service.updateTask('id-inexistente', { description: 'Nueva descripción' });

      expect(result).toBeNull();
    });

    it('debería actualizar updatedAt', (done) => {
      const task = service.createTask({ description: 'Tarea de prueba' });
      const originalUpdatedAt = task.updatedAt;

      setTimeout(() => {
        const updatedTask = service.updateTask(task.id, { description: 'Actualizada' });
        expect(updatedTask?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        done();
      }, 10);
    });
  });

  describe('toggleTaskCompletion', () => {
    it('debería marcar una tarea como completada', () => {
      const task = service.createTask({ description: 'Tarea de prueba' });
      
      const toggledTask = service.toggleTaskCompletion(task.id);

      expect(toggledTask?.completed).toBe(true);
      expect(service.completedCount()).toBe(1);
    });

    it('debería desmarcar una tarea completada', () => {
      const task = service.createTask({ description: 'Tarea de prueba' });
      service.updateTask(task.id, { completed: true });

      const toggledTask = service.toggleTaskCompletion(task.id);

      expect(toggledTask?.completed).toBe(false);
      expect(service.completedCount()).toBe(0);
      expect(service.pendingCount()).toBe(1);
    });

    it('debería retornar null si la tarea no existe', () => {
      const result = service.toggleTaskCompletion('id-inexistente');

      expect(result).toBeNull();
    });
  });

  describe('deleteTask', () => {
    it('debería eliminar una tarea existente', () => {
      const task = service.createTask({ description: 'Tarea a eliminar' });

      const result = service.deleteTask(task.id);

      expect(result).toBe(true);
      expect(service.getTasks().length).toBe(0);
      expect(service.taskCount()).toBe(0);
    });

    it('debería retornar false si la tarea no existe', () => {
      const result = service.deleteTask('id-inexistente');

      expect(result).toBe(false);
    });

    it('no debería afectar otras tareas', () => {
      const task1 = service.createTask({ description: 'Tarea 1' });
      const task2 = service.createTask({ description: 'Tarea 2' });

      service.deleteTask(task1.id);

      const tasks = service.getTasks();
      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe(task2.id);
    });
  });

  describe('clearAllTasks', () => {
    it('debería eliminar todas las tareas', () => {
      service.createTask({ description: 'Tarea 1' });
      service.createTask({ description: 'Tarea 2' });
      service.createTask({ description: 'Tarea 3' });

      service.clearAllTasks();

      expect(service.getTasks().length).toBe(0);
      expect(service.taskCount()).toBe(0);
    });
  });

  describe('Computed Signals', () => {
    it('debería calcular taskCount correctamente', () => {
      expect(service.taskCount()).toBe(0);
      
      service.createTask({ description: 'Tarea 1' });
      expect(service.taskCount()).toBe(1);
      
      service.createTask({ description: 'Tarea 2' });
      expect(service.taskCount()).toBe(2);
    });

    it('debería calcular completedCount correctamente', () => {
      const task1 = service.createTask({ description: 'Tarea 1' });
      const task2 = service.createTask({ description: 'Tarea 2' });
      
      expect(service.completedCount()).toBe(0);
      
      service.updateTask(task1.id, { completed: true });
      expect(service.completedCount()).toBe(1);
      
      service.updateTask(task2.id, { completed: true });
      expect(service.completedCount()).toBe(2);
    });

    it('debería calcular pendingCount correctamente', () => {
      const task1 = service.createTask({ description: 'Tarea 1' });
      const task2 = service.createTask({ description: 'Tarea 2' });
      
      expect(service.pendingCount()).toBe(2);
      
      service.updateTask(task1.id, { completed: true });
      expect(service.pendingCount()).toBe(1);
      
      service.updateTask(task2.id, { completed: true });
      expect(service.pendingCount()).toBe(0);
    });
  });

  describe('Signal reactivity', () => {
    it('signals deberían actualizarse reactivamente al crear tareas', () => {
      const initialCount = service.taskCount();
      
      service.createTask({ description: 'Nueva tarea' });
      
      expect(service.taskCount()).toBe(initialCount + 1);
      expect(service.tasks().length).toBe(initialCount + 1);
    });

    it('signals deberían actualizarse reactivamente al eliminar tareas', () => {
      const task = service.createTask({ description: 'Tarea a eliminar' });
      const countBeforeDelete = service.taskCount();
      
      service.deleteTask(task.id);
      
      expect(service.taskCount()).toBe(countBeforeDelete - 1);
    });
  });

  describe('localStorage persistence', () => {
    it('debería cargar tareas desde localStorage al iniciar', () => {
      const mockTasks: Task[] = [
        {
          id: '1',
          description: 'Tarea guardada',
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      localStorageSpy.getItem.and.returnValue(JSON.stringify(mockTasks));

      // Crear nueva instancia del servicio
      const newService = new TaskService();

      expect(newService.getTasks().length).toBe(1);
      expect(newService.getTasks()[0].description).toBe('Tarea guardada');
      expect(newService.taskCount()).toBe(1);
    });

    it('debería manejar errores al cargar desde localStorage', () => {
      localStorageSpy.getItem.and.returnValue('invalid json');
      
      // No debería lanzar error
      expect(() => new TaskService()).not.toThrow();
    });

    it('debería persistir cambios en localStorage', () => {
      service.createTask({ description: 'Tarea persistida' });
      
      expect(localStorageSpy.setItem).toHaveBeenCalled();
    });
  });
});
