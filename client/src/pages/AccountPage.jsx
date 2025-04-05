import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AccountService from '../services/account.service';

// Компонент элемента списка аккаунтов
const AccountListItem = ({ account, onCheck, onDelete }) => {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-yellow-100 text-yellow-800',
    banned: 'bg-red-100 text-red-800',
    limited: 'bg-orange-100 text-orange-800'
  };

  // Форматирование даты создания
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
              onChange={() => onCheck(account._id)}
            />
            <Link to={`/accounts/${account._id}`} className="text-lg font-medium text-indigo-600 hover:text-indigo-500">
              {account.name}
            </Link>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[account.status] || 'bg-gray-100'}`}>
            {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
          <div>
            <span className="text-gray-500">Created:</span> {formatDate(account.createdAt)}
          </div>
          <div>
            <span className="text-gray-500">Last Used:</span> {account.lastUsed ? formatDate(account.lastUsed) : 'Never'}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {account.proxy && (
            <div className="bg-purple-50 text-purple-600 px-2 py-1 rounded text-xs flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
              </svg>
              {account.proxy.name}
            </div>
          )}
          
          {account.dolphinProfileId && (
            <div className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Dolphin Profile
            </div>
          )}
          
          {account.emailAccess?.email && (
            <div className="bg-green-50 text-green-600 px-2 py-1 rounded text-xs flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              {account.emailAccess.email}
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-4 pt-3 border-t">
          <div className="flex space-x-2">
            <Link
              to={`/accounts/${account._id}`}
              className="text-sm text-indigo-600 hover:text-indigo-900"
            >
              Details
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              to={`/accounts/${account._id}/edit`}
              className="text-sm text-indigo-600 hover:text-indigo-900"
            >
              Edit
            </Link>
          </div>
          
          <button
            onClick={() => onDelete(account._id)}
            className="text-sm text-red-600 hover:text-red-900"
            type="button"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Основной компонент страницы
const AccountsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  const itemsPerPage = 10;
  
  // Загрузка списка аккаунтов
  const fetchAccounts = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      // Формирование параметров запроса
      const params = {
        page,
        limit: itemsPerPage,
        ...statusFilter && { status: statusFilter },
        ...searchTerm && { search: searchTerm }
      };
      
      // Запрос к API
      const response = await AccountService.getAllAccounts(params);
      
      setAccounts(response.data.accounts);
      setTotalPages(response.data.pagination.pages);
      setCurrentPage(response.data.pagination.page);
    } catch (err) {
      setError(err.message || 'Failed to fetch accounts');
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Загрузка данных при монтировании компонента
  useEffect(() => {
    fetchAccounts();
  }, []);
  
  // Перезагрузка данных при изменении фильтров
  useEffect(() => {
    // Сбрасываем на первую страницу при изменении фильтров
    setCurrentPage(1);
    fetchAccounts(1);
  }, [searchTerm, statusFilter]);
  
  // Обработчик выбора аккаунта
  const handleAccountCheck = (accountId) => {
    setSelectedAccounts(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };
  
  // Обработчик удаления аккаунта
  const handleAccountDelete = (accountId) => {
    setConfirmDelete(accountId);
  };
  
  // Подтверждение удаления аккаунта
  const confirmAccountDelete = async () => {
    try {
      setLoading(true);
      await AccountService.deleteAccount(confirmDelete);
      
      // Обновление списка аккаунтов
      setAccounts(prev => prev.filter(acc => acc._id !== confirmDelete));
      
      // Очистка выбранного аккаунта из списка выбранных
      setSelectedAccounts(prev => prev.filter(id => id !== confirmDelete));
      
      // Сброс состояния подтверждения
      setConfirmDelete(null);
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Failed to delete account');
    } finally {
      setLoading(false);
    }
  };
  
  // Обработчик удаления выбранных аккаунтов
  const handleBulkDelete = async () => {
    // В продакшн версии здесь должно быть подтверждение и массовое удаление
    alert(`Selected accounts: ${selectedAccounts.join(', ')}`);
  };
  
  // Обработчик проверки статуса выбранных аккаунтов
  const handleCheckStatus = async () => {
    // В продакшн версии здесь должна быть проверка статуса аккаунтов
    alert(`Checking status for accounts: ${selectedAccounts.join(', ')}`);
  };
  
  // Обработчик смены страницы
  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchAccounts(page);
  };

  return (
    <div className="py-6">
      {/* Заголовок страницы */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Facebook Accounts</h1>
        <Link
          to="/accounts/add"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          + Add Account
        </Link>
      </div>
      
      {/* Фильтры и поиск */}
      <div className="mb-6 p-4 bg-white shadow-md rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              name="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search accounts..."
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="banned">Banned</option>
              <option value="limited">Limited</option>
            </select>
          </div>
          
          <div className="flex items-end space-x-2">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                fetchAccounts(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
      
      {/* Панель действий с выбранными аккаунтами */}
      {selectedAccounts.length > 0 && (
        <div className="mb-6 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex justify-between items-center">
          <div className="text-sm font-medium text-indigo-700">
            {selectedAccounts.length} account(s) selected
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleCheckStatus}
              className="px-3 py-1 border border-indigo-300 rounded-md text-xs font-medium text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Check Status
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 border border-red-300 rounded-md text-xs font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}
      
      {/* Индикатор загрузки */}
      {loading && (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      )}
      
      {/* Сообщение об ошибке */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {/* Список аккаунтов */}
      {!loading && !error && accounts.length === 0 && (
        <div className="bg-white shadow-md rounded-lg p-6 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="text-lg font-medium mb-2">No accounts found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter
              ? 'Try changing your search criteria'
              : 'Start by adding your Facebook accounts to automate'}
          </p>
          <Link
            to="/accounts/add"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Add Account
          </Link>
        </div>
      )}
      
      {!loading && !error && accounts.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map(account => (
              <AccountListItem
                key={account._id}
                account={account}
                onCheck={handleAccountCheck}
                onDelete={handleAccountDelete}
              />
            ))}
          </div>
          
          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Previous
                </button>
                
                {[...Array(totalPages).keys()].map(page => (
                  <button
                    key={page + 1}
                    onClick={() => handlePageChange(page + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === page + 1
                        ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page + 1}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </>
      )}
      
      {/* Модальное окно подтверждения удаления */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to delete this account? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmAccountDelete}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsPage;