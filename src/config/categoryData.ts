import { Category } from '../classes/Category';
import i18n from '@/i18n';

export const categories: Category[] = [
    new Category('events', i18n.t('categories.events'), require('../../assets/events_icon.png'), '#e8f5e9'),
    new Category('universities', i18n.t('categories.universities'), undefined, '#e8f5e9'),
    new Category('restaurants', i18n.t('categories.restaurants'), require('../../assets/food_icon.png'), '#e3f2fd'),
    new Category('music', i18n.t('categories.music'), require('../../assets/music_icon.png'), '#e1f5fe'),
    new Category('news', i18n.t('categories.news'), require('../../assets/news_icon.png'), '#e0f2f1'),
    new Category('study hub', i18n.t('categories.studyhub'), require('../../assets/studyhub_icon.png'), '#e8f5e9'),
    new Category('petpals', i18n.t('categories.petpals'), require('../../assets/petpals_icon.png'), '#fff8e1'),
    new Category('deals', i18n.t('categories.deals'), require('../../assets/deals_icon.png'), '#FFF7EE'),
    new Category('random', i18n.t('categories.random'), require('../../assets/random_icon.png'), '#b2ebf2'),
    new Category('ruteros', i18n.t('categories.ruteros'), require('../../assets/ruteros_icon.png'), '#b2ebf2'),
    new Category('hotels', i18n.t('categories.hotels'), require('../../assets/hoteles_icon.png'), '#b2ebf2'),
    new Category('business', i18n.t('categories.business'), require('../../assets/business_icon.png'), '#b2ebf2'),
    new Category('tutors', i18n.t('categories.tutors'), require('../../assets/tutors_icon.png'), '#f3e5f5'),
    new Category('sports', i18n.t('categories.sports'), require('../../assets/sports_icon.png'), '#b2ebf2'),
];

export function getCategoryByKey(key: string): Category | undefined {
    return categories.find(category => category.key === key);
}