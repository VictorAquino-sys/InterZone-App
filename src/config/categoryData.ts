import { Category } from '../classes/Category';
import i18n from '../i18n';

export const categories: Category[] = [
    new Category('events', i18n.t('categories.events'), require('../../assets/events_icon.png')),
    new Category('restaurants', i18n.t('categories.restaurants'), require('../../assets/food_icon.png')),
    new Category('music', i18n.t('categories.music'), require('../../assets/music_icon.png')),
    new Category('news', i18n.t('categories.news'), require('../../assets/news_icon.png')),
    new Category('study hub', i18n.t('categories.studyhub'), require('../../assets/studyhub_icon.png')),
    new Category('petpals', i18n.t('categories.petpals'), require('../../assets/petpals_icon.png')),
    new Category('deals', i18n.t('categories.deals'), require('../../assets/deals_icon.png')),
    new Category('random', i18n.t('categories.random'), require('../../assets/random_icon.png'))
];

export function getCategoryByKey(key: string): Category | undefined {
    return categories.find(category => category.key === key);
}