import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from '../screens/SplashScreen';
import ProfilesScreen from '../screens/ProfilesScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import TvScreen from '../screens/TvScreen';
import MoviesScreen from '../screens/MoviesScreen';
import SeriesScreen from '../screens/SeriesScreen';
import DetailsScreen from '../screens/DetailsScreen';
import PlayerScreen from '../screens/PlayerScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import DevShowcaseScreen from '../screens/DevShowcaseScreen';
import { RequireProfile } from '../components/RequireProfile';
import { RequireAuth } from '../components/RequireAuth';

const ProfileLayout: React.FC = () => {
  return <RequireProfile />;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Navigate replace to="/splash" />} />
      <Route path="/splash" element={<SplashScreen />} />
      <Route path="/login" element={<LoginScreen />} />

      {/* Dev Showcase (Available in dev/demo mode) */}
      <Route path="/dev/showcase" element={<DevShowcaseScreen />} />

      {/* Protected routes (require auth) */}
      <Route element={<RequireAuth />}>
        <Route path="/profiles" element={<ProfilesScreen />} />
        
        {/* Protected routes (require profile selected) */}
        <Route element={<ProfileLayout />}>
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/tv" element={<TvScreen />} />
          <Route path="/filmes" element={<MoviesScreen />} />
          <Route path="/movies" element={<MoviesScreen />} />
          <Route path="/series" element={<SeriesScreen />} />
          <Route path="/search" element={<SearchScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/favorites" element={<FavoritesScreen />} />
          <Route path="/details/:id" element={<DetailsScreen />} />
          <Route path="/player/:id" element={<PlayerScreen />} />
        </Route>
      </Route>

      {/* Fallback to home */}
      <Route path="*" element={<Navigate replace to="/home" />} />
    </Routes>
  );
};