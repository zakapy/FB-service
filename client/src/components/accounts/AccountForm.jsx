import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AccountService from '../../services/account.service';
import ProxyService from '../../services/proxy.service';

const AccountForm = ({ account = null, isEditing = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    cookies: '',
    proxyId: '',
    emailAccess: {
      email: '',
      password: '',
      recoveryEmail: '',
      phoneNumber: ''
    },
    notes: '',
    createDolphinProfile: true
  });
  const [proxies, setProxies] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [cookiesStatus, setCookiesStatus] = useState(null);
  const [showEmailAccess, setShowEmailAccess] = useState(false);
  
  const navigate = useNavigate();
  
  // Загрузка данных аккаунта при редактировании и списка прокси
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Загрузка списка прокси
        const proxyResponse = await ProxyService.getAllProxies({ limit: 100 });
        setProxies(proxyResponse.data.proxies);
        
        // Если режим редактирования, загружаем данные аккаунта
        if (isEditing && account) {
          setFormData({
            name: account.name,
            cookies: '', // Не возвращается с сервера в открытом виде
            proxyId: account.proxy?._id || '',
            emailAccess: {
              email: account.emailAccess?.email || '',
              password: '',  // Не возвращается с сервера в открытом виде
              recoveryEmail: account.emailAccess?.recoveryEmail || '',
              phoneNumber: account.emailAccess?.phoneNumber || ''
            },
            notes: account.notes || '',
            createDolphinProfile: !!account.dolphinProfileId
          });
          
          // Если есть данные о доступе к email, показываем форму
          if (account.emailAccess?.email) {
            setShowEmailAccess(true);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    fetchData();
  }, [account, isEditing]);
  
  // Обработчик изменения полей формы
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Для вложенных полей emailAccess
    if (name.startsWith('emailAccess.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        emailAccess: {
          ...prev.emailAccess,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Очистка ошибки при изменении поля
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Проверка cookies при изменении
    if (name === 'cookies' && value.trim()) {
      validateCookies(value);
    }
  };
  
  // Обработчик изменения чекбоксов
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  // Валидация формы
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Account name is required';
    }
    
    if (!formData.cookies.trim() && !isEditing) {
      newErrors.cookies = 'Cookies are required';
    }
    
    if (showEmailAccess) {
      if (formData.emailAccess.email && !/\S+@\S+\.\S+/.test(formData.emailAccess.email)) {
        newErrors['emailAccess.email'] = 'Invalid email format';
      }
      
      if (formData.emailAccess.recoveryEmail && !/\S+@\S+\.\S+/.test(formData.emailAccess.recoveryEmail)) {
        newErrors['emailAccess.recoveryEmail'] = 'Invalid email format';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Валидация строки cookies
  const validateCookies = (cookiesString) => {
    try {
      const result = AccountService.analyzeCookies(cookiesString);
      setCookiesStatus(result);
      
      if (!result.valid) {
        setErrors(prev => ({
          ...prev,
          cookies: result.message
        }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.cookies;
          return newErrors;
        });
      }
      
      return result.valid;
    } catch (error) {
      setCookiesStatus({ valid: false, message: 'Invalid cookies format' });
      return false;
    }
  };
  
  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Валидация формы
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Подготовка данных для отправки
      const accountData = { ...formData };
      
      // Если раздел emailAccess не используется, удаляем его
      if (!showEmailAccess) {
        delete accountData.emailAccess;
      }
      
      if (isEditing) {
        // Обновление существующего аккаунта
        await AccountService.updateAccount(account._id, accountData);
        navigate(`/accounts/${account._id}`);
      } else {
        // Создание нового аккаунта
        const response = await AccountService.createAccount(accountData);
        navigate(`/accounts/${response.data.account._id}`);
      }
    } catch (error) {
      const errorMessage = error.message || 'An error occurred';
      setErrors(prev => ({
        ...prev,
        general: errorMessage
      }));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-medium text-gray-900">
          {isEditing ? 'Edit Account' : 'Add New Facebook Account'}
        </h2>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6">
        {/* Сообщение об ошибке */}
        {errors.general && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.general}
          </div>
        )}
        
        {/* Имя аккаунта */}
        <div className="mb-6">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Account Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full rounded-md border ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            } px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
            placeholder="My Facebook Account"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>
        
        {/* Cookies */}
        <div className="mb-6">
          <label htmlFor="cookies" className="block text-sm font-medium text-gray-700 mb-1">
            Cookies {!isEditing && '*'}
            <span className="text-xs text-gray-500 ml-2">
              (Copy from browser developer tools)
            </span>
          </label>
          <textarea
            id="cookies"
            name="cookies"
            value={formData.cookies}
            onChange={handleChange}
            rows="6"
            className={`w-full rounded-md border ${
              errors.cookies ? 'border-red-500' : 'border-gray-300'
            } px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
            placeholder='[{"name":"c_user","value":"1000xxxx","domain":".facebook.com"}, ...]'
          />
          {errors.cookies && <p className="mt-1 text-sm text-red-600">{errors.cookies}</p>}
          
          {/* Статус проверки cookies */}
          {cookiesStatus && (
            <div className={`mt-2 p-2 rounded text-sm ${
              cookiesStatus.valid
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            }`}>
              {cookiesStatus.valid
                ? (
                  <div className="flex items-center">
                    <svg className="h-4 w-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Valid cookies detected: {cookiesStatus.cookiesCount} cookies from {cookiesStatus.domains.length} domains
                  </div>
                )
                : cookiesStatus.message
              }
            </div>
          )}
        </div>
        
        {/* Прокси */}
        <div className="mb-6">
          <label htmlFor="proxyId" className="block text-sm font-medium text-gray-700 mb-1">
            Proxy
          </label>
          <select
            id="proxyId"
            name="proxyId"
            value={formData.proxyId}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">-- Select a proxy (optional) --</option>
            {proxies.map(proxy => (
              <option key={proxy._id} value={proxy._id}>
                {proxy.name} ({proxy.host}:{proxy.port})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Using a proxy helps avoid rate limiting and detection.
          </p>
        </div>
        
        {/* Настройка профиля Dolphin Anty */}
        <div className="mb-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="createDolphinProfile"
              name="createDolphinProfile"
              checked={formData.createDolphinProfile}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="createDolphinProfile" className="ml-2 block text-sm text-gray-700">
              Create Dolphin Anty profile
            </label>
          </div>
          <p className="mt-1 text-xs text-gray-500 pl-6">
            Create a browser profile in Dolphin Anty for easy automation.
          </p>
        </div>
        
        {/* Дополнительная информация о доступе к email */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowEmailAccess(!showEmailAccess)}
            className="flex items-center text-sm text-indigo-600 hover:text-indigo-500"
          >
            <span className="mr-1">
              {showEmailAccess ? '− Hide email access details' : '+ Add email access details'}
            </span>
          </button>
          
          {showEmailAccess && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-sm text-gray-600 mb-4">
                Add email access details to help recover account if cookies expire.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="emailAccess.email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="emailAccess.email"
                    name="emailAccess.email"
                    value={formData.emailAccess.email}
                    onChange={handleChange}
                    className={`w-full rounded-md border ${
                      errors['emailAccess.email'] ? 'border-red-500' : 'border-gray-300'
                    } px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                    placeholder="account@example.com"
                  />
                  {errors['emailAccess.email'] && <p className="mt-1 text-sm text-red-600">{errors['emailAccess.email']}</p>}
                </div>
                
                <div>
                  <label htmlFor="emailAccess.password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    id="emailAccess.password"
                    name="emailAccess.password"
                    value={formData.emailAccess.password}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Email password"
                  />
                </div>
                
                <div>
                  <label htmlFor="emailAccess.recoveryEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Recovery Email
                  </label>
                  <input
                    type="email"
                    id="emailAccess.recoveryEmail"
                    name="emailAccess.recoveryEmail"
                    value={formData.emailAccess.recoveryEmail}
                    onChange={handleChange}
                    className={`w-full rounded-md border ${
                      errors['emailAccess.recoveryEmail'] ? 'border-red-500' : 'border-gray-300'
                    } px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                    placeholder="recovery@example.com"
                  />
                  {errors['emailAccess.recoveryEmail'] && <p className="mt-1 text-sm text-red-600">{errors['emailAccess.recoveryEmail']}</p>}
                </div>
                
                <div>
                  <label htmlFor="emailAccess.phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    id="emailAccess.phoneNumber"
                    name="emailAccess.phoneNumber"
                    value={formData.emailAccess.phoneNumber}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="+1234567890"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Примечания */}
        <div className="mb-6">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Additional information about this account..."
          />
        </div>
        
        {/* Кнопки действий */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/accounts')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
          >
            {loading 
              ? (isEditing ? 'Updating...' : 'Creating...') 
              : (isEditing ? 'Update Account' : 'Create Account')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AccountForm;