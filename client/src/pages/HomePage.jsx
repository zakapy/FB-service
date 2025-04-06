import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AccountService from '../services/account.service';
import ProxyService from '../services/proxy.service';

// Компонент статистической карточки
const StatCard = ({ title, value, icon, color, subtext, linkTo }) => {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <Link to={linkTo} className="block hover:bg-gray-50 transition-colors">
        <div className="p-5">
          <div className="flex items-center">
            <div className={`rounded-full p-3 mr-4 ${color}`}>
              {icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-700">{title}</h3>
              <p className="text-gray-500 text-sm">{subtext}</p>
            </div>
            <div className="text-3xl font-bold text-gray-900">{value}</div>
          </div>
        </div>
      </Link>
    </div>
  );
};

// Основной компонент страницы
const HomePage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalAccounts: '...',
    activeAccounts: '...',
    totalProxies: '...',
    activeProxies: '...',
    automationJobs: '...',
    activeJobs: '...'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Загрузка статистики при монтировании компонента
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Запросы к API для получения статистики
        const accountsResponse = await AccountService.getAllAccounts({ limit: 1 });
        const proxiesResponse = await ProxyService.getAllProxies({ limit: 1 });
        
        // Обновление состояния
        setStats({
          totalAccounts: accountsResponse.data.pagination.total,
          activeAccounts: '—', // В дальнейшем можно получать через API
          totalProxies: proxiesResponse.data.pagination.total,
          activeProxies: '—', // В дальнейшем можно получать через API
          automationJobs: '—', // В дальнейшем можно получать через API
          activeJobs: '—' // В дальнейшем можно получать через API
        });
        
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to fetch statistics');
        console.error('Error fetching statistics:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  return (
    <div className="py-6">
      {/* Заголовок страницы */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Welcome back, {user?.username || 'User'}! Here's what's happening with your accounts.
        </p>
      </div>
      
      {/* Индикатор загрузки */}
      {loading && (
        <div className="bg-white shadow-md rounded-lg p-6 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}
      
      {/* Ошибка загрузки */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard data</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Статистические карточки */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Facebook Accounts"
            value={stats.totalAccounts}
            subtext={`${stats.activeAccounts} active`}
            color="bg-blue-100 text-blue-500"
            linkTo="/accounts"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />
          
          <StatCard
            title="Proxies"
            value={stats.totalProxies}
            subtext={`${stats.activeProxies} active`}
            color="bg-purple-100 text-purple-500"
            linkTo="/proxies"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            }
          />
          
          <StatCard
            title="Automation Jobs"
            value={stats.automationJobs}
            subtext={`${stats.activeJobs} running`}
            color="bg-green-100 text-green-500"
            linkTo="/automation"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
        </div>
      )}
      
      {/* Быстрые действия */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/accounts/add"
            className="bg-white border border-gray-200 rounded-lg p-4 flex items-center hover:bg-gray-50 transition-colors"
          >
            <div className="rounded-full bg-blue-100 p-2 mr-4 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">Add Account</h3>
              <p className="text-sm text-gray-500">Import your FB account cookies</p>
            </div>
          </Link>
          
          <Link
            to="/proxies/add"
            className="bg-white border border-gray-200 rounded-lg p-4 flex items-center hover:bg-gray-50 transition-colors"
          >
            <div className="rounded-full bg-purple-100 p-2 mr-4 text-purple-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">Add Proxy</h3>
              <p className="text-sm text-gray-500">Configure a new proxy server</p>
            </div>
          </Link>
          
          <Link
            to="/automation/create"
            className="bg-white border border-gray-200 rounded-lg p-4 flex items-center hover:bg-gray-50 transition-colors"
          >
            <div className="rounded-full bg-green-100 p-2 mr-4 text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">Setup Automation</h3>
              <p className="text-sm text-gray-500">Create new automation job</p>
            </div>
          </Link>
        </div>
      </div>
      
      {/* Последняя активность */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6 border-b">
            <div className="text-center text-gray-500 py-8">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-lg font-medium mb-2">No recent activity</h3>
              <p className="mb-4">Start by adding accounts and setting up automation jobs.</p>
              <Link to="/accounts/add" className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Подсказка по использованию */}
      <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-indigo-800">Getting Started</h3>
            <div className="mt-2 text-sm text-indigo-700">
              <p>To get started with FB Automation:</p>
              <ol className="list-decimal pl-5 space-y-1 mt-2">
                <li>Add your Facebook account cookies</li>
                <li>Configure proxies to avoid rate limiting</li>
                <li>Create automation tasks for likes, comments, and more</li>
              </ol>
            </div>
            <div className="mt-4">
              <a href="https://docs.example.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-500 font-medium text-sm">
                Read Documentation →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;