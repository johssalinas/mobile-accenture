import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { CategoryWithCount } from '../../../core/models/category.model';
import { addIcons } from 'ionicons';
import { 
  briefcaseOutline,
  homeOutline, 
  bulbOutline, 
  personOutline, 
  barbellOutline,
  airplaneOutline,
  cartOutline,
  schoolOutline,
  heartOutline,
  starOutline,
  restaurantOutline,
  filmOutline,
  musicalNoteOutline,
  musicalNotesOutline,
  footballOutline,
  colorPaletteOutline,
  codeOutline,
  pawOutline,
  sunnyOutline,
  medkitOutline,
  carOutline,
  clipboardOutline,
  bookOutline,
  peopleOutline,
  fitnessOutline,
  cafeOutline,
  trophyOutline,
  walletOutline,
  cardOutline,
  giftOutline,
  gameControllerOutline,
  bicycleOutline,
  trainOutline,
  pizzaOutline,
  basketballOutline,
  cameraOutline,
  bagOutline,
  leafOutline
} from 'ionicons/icons';

/**
 * Componente presentacional para mostrar una tarjeta de categoría
 * Emite eventos de click y long press
 */
@Component({
  selector: 'app-category-card',
  templateUrl: './category-card.component.html',
  styleUrls: ['./category-card.component.scss'],
  imports: [IonIcon]
})
export class CategoryCardComponent {
  @Input({ required: true }) category!: CategoryWithCount;
  @Input() taskCount: number = 0;
  
  @Output() categoryClick = new EventEmitter<CategoryWithCount>();
  @Output() categoryLongPress = new EventEmitter<{ category: CategoryWithCount; event: Event }>();

  constructor() {
    addIcons({ 
      'briefcase-outline': briefcaseOutline,
      'home-outline': homeOutline,
      'bulb-outline': bulbOutline,
      'person-outline': personOutline,
      'barbell-outline': barbellOutline,
      'fitness-outline': fitnessOutline,
      'airplane-outline': airplaneOutline,
      'cart-outline': cartOutline,
      'school-outline': schoolOutline,
      'heart-outline': heartOutline,
      'star-outline': starOutline,
      'restaurant-outline': restaurantOutline,
      'film-outline': filmOutline,
      'musical-note-outline': musicalNoteOutline,
      'musical-notes-outline': musicalNotesOutline,
      'football-outline': footballOutline,
      'color-palette-outline': colorPaletteOutline,
      'code-outline': codeOutline,
      'paw-outline': pawOutline,
      'sunny-outline': sunnyOutline,
      'medkit-outline': medkitOutline,
      'car-outline': carOutline,
      'clipboard-outline': clipboardOutline,
      'book-outline': bookOutline,
      'people-outline': peopleOutline,
      'cafe-outline': cafeOutline,
      'trophy-outline': trophyOutline,
      'wallet-outline': walletOutline,
      'card-outline': cardOutline,
      'gift-outline': giftOutline,
      'game-controller-outline': gameControllerOutline,
      'bicycle-outline': bicycleOutline,
      'train-outline': trainOutline,
      'pizza-outline': pizzaOutline,
      'basketball-outline': basketballOutline,
      'camera-outline': cameraOutline,
      'bag-outline': bagOutline,
      'leaf-outline': leafOutline
    });
  }

  protected handleClick(): void {
    this.categoryClick.emit(this.category);
  }

  protected handleLongPress(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.categoryLongPress.emit({ category: this.category, event });
  }
}
