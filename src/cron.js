/**
 * @class               Cron
 * @namespace           Cron
 * @version             1.0.0
 * @author              Maksym Stoianov <stoianov.maksym@gmail.com>
 * @license             MIT
 * @tutorial            https://maksymstoianov.com/
 * @see                 [GitHub](https://github.com/MaksymStoianov/Cron)
 * @see                 https://github.com/node-cron/node-cron
 * @see                 https://cloud.google.com/scheduler/docs/configuring/cron-job-schedules
 */
class Cron {

  /**
   * Парсит cron-выражение и возвращает его части.
   * @param {string} expression Cron-выражение для парсинга.
   * @return {Object} Объект, содержащий части cron-выражения.
   */
  // TODO: Предопределенные определения расписания.
  // `0 0 1 1 * *`  `@yearly`    Раз в год в полночь 1 января.
  // `0 0 1 1 * *`  `@annually`  Раз в год в полночь 1 января.
  // `0 0 1 * * *`  `@monthly`   Раз в месяц в полночь первого дня месяца.
  // `0 0 * * 0 *`  `@weekly`    Раз в неделю в полночь в воскресенье утром.
  // `0 0 * * * *`  `@daily`     Раз в день в полночь.
  // `0 * * * * *`  `@hourly`    Раз в час в начале часа.
  static parseExpression(expression) {
    const parts = expression.split(' ');

    if (parts.length < 5 || parts.length > 7) {
      throw new Error('Invalid cron expression format');
    }


    /**
     * @param {string} type
     * @param {string} field часть cron выражения
     * @param {Integer} min минимальное значение
     * @param {Integer} max максимальное значение
     */
    const _parseField = (type, field, min, max) => {
      // TODO: Учесть тип поля при парсинге.
      const result = [];

      if (field === '*') {
        for (let i = min; i <= max; i++) {
          result.push(i);
        }
      } else if (field.includes('/')) {
        const [rangeField, stepField] = field.split('/');

        const range = rangeField === '*' ? [min, max] : rangeField
          .split('-')
          .map(Number);

        const step = parseInt(stepField, 10);

        for (let i = range[0]; i <= range[1]; i += step) {
          result.push(i);
        }
      } else if (field.includes('-')) {
        const [start, end] = field
          .split('-')
          .map(Number);

        for (let i = start; i <= end; i++) {
          result.push(i);
        }
      } else if (field.includes(',')) {
        result.push(...field.split(',').map(Number));
      } else {
        result.push(parseInt(field, 10));
      }

      return result;
    };


    /**
     * @see https://www.easycron.com/faq/What-cron-expression-does-easycron-support
     */
    return {
      expression,

      minutes: _parseField("minutes", parts[0], 0, 59),

      hours: _parseField("hours", parts[1], 0, 23),

      // TODO: L W
      daysOfMonth: _parseField("daysOfMonth", parts[2], 1, 31),

      // TODO: 1 - 12 (representing Jan - Dec), JAN - DEC (case-insensitive), JANUARY - DECEMBER(case-insensitive)
      months: _parseField("months", parts[3], 1, 12),

      // TODO: 0 - 6, 7 (representing Sun - Sat and Sun again), SUN - SAT (case-insensitive), SUNDAY - SATURDAY(case-insensitive)
      // TODO: ? L #
      daysOfWeek: _parseField("daysOfWeek", parts[4], 0, 6),

      years: parts.length === 6 ? _parseField("years", parts[5], 1970, 2099) : []
    };
  }



  /**
   * Проверяет, является ли cron-выражение валидным.
   * @param {string} expression Cron-выражение для проверки.
   * @return {boolean} `true`, если выражение валидное, иначе `false`.
   */
  static isValidExpression(expression) {
    const parts = expression.split(' ');

    // Проверка на количество частей (5-7 частей в зависимости от формата)
    if (parts.length < 5 || parts.length > 7) {
      return false;
    }

    /**
     * Проверка поля cron на допустимые значения
     * @param {string} field часть cron выражения
     * @param {Integer} min минимальное значение
     * @param {Integer} max максимальное значение
     * @return {boolean}
     */
    const _isValidField = (field, min, max) => {
      // '*' соответствует всему диапазону
      if (field === '*') return true;

      const regex = /^(\d+|\*)(\/\d+)?(-\d+)?(,\d+)*$/;

      // Если поле не соответствует синтаксису cron, оно недействительно
      if (!regex.test(field)) return false;

      const values = field
        .replace(/\/\d+/, '') // Убираем шаги (например, '/2')
        .replace(/-\d+/, '')  // Убираем диапазоны (например, '1-5')
        .replace(/\*/, min)   // Заменяем '*' на минимальное значение
        .split(',')
        .map(Number);

      // Проверяем, что все значения находятся в допустимом диапазоне
      return values.every(val => val >= min && val <= max);
    };

    return (
      _isValidField(parts[0], 0, 59) &&   // Минуты
      _isValidField(parts[1], 0, 23) &&   // Часы
      _isValidField(parts[2], 1, 31) &&   // Дни месяца
      _isValidField(parts[3], 1, 12) &&   // Месяцы
      _isValidField(parts[4], 0, 6) &&    // Дни недели
      (parts.length < 6 || _isValidField(parts[5], 1970, 2099)) // Годы, если они есть
    );
  }



  /**
   * Проверяет, был ли уже инициализирован cron.
   * @return {boolean} `true`, если cron был инициализирован, иначе `false`.
   */
  static isCronInit() {
    const triggers = ScriptApp.getProjectTriggers();

    for (const trigger of triggers) {
      if (trigger.getHandlerFunction() === "cron") {
        return true;
      }
    }

    return false;
  }



  /**
   * Инициализирует Cron.
   * @param {...*} args Аргументы для инициализации.
   * @return {Cron} Возвращает прокси-объект cron.
   */
  static init(...args) {
    /**
     * @type {Cron}
     */
    const instance = Reflect.construct(this, args);

    /**
     * Прокси для вызова run и доступ ко всем методам экземпляра.
     * @type {Cron}
     */
    const proxy = (...args) => instance.run(...args);

    // Копируем все методы и свойства экземпляра на прокси
    Object.setPrototypeOf(proxy, instance);

    return proxy;
  }



  /**
   * @param {...*} args Аргументы для конструктора.
   */
  constructor(...args) {
    if (!this.constructor.isCronInit()) {
      ScriptApp.newTrigger("cron")
        .timeBased()
        .everyMinutes(1)
        .create();
    }


    // TODO: Проверить если несколько триггеров cron установлены, удалить лишние.

    // TODO: Проверить есть ли системная задача: "очистка задач которые больше никогда не выполнятся". Если нет, установить.


    /**
     * @type {string}
     */
    this.PROPERTY_KEY_JOBS = "CRONE_JOBS";


    try {
      /**
       * @type {SettingsService.Settings}
       */
      this._props = SettingsService
        .getScriptSettings();
    } catch (error) {
      console.warn(`SettingsService not found!`);

      /**
       * @type {PropertiesService.Properties}
       */
      this._props = PropertiesService
        .getScriptProperties();
    }


    for (const key of Object.getOwnPropertyNames(this)) {
      if (!key.startsWith('_')) continue;

      Object.defineProperty(this, key, {
        "configurable": true,
        "enumerable": false,
        "writable": true
      });
    }
  }



  /**
   * Создает новую задачу cron.
   * @param {...*} args Аргументы для новой задачи.
   * @return {CronJob} Возвращает новый объект задачи.
   */
  newJob(...args) {
    /**
     * @type {CronJob}
     */
    const job = Reflect.construct(this.constructor.CronJob, args);

    job._parent = this;

    return job;
  }



  /**
   * Планирует выполнение данной задачи каждый раз, когда срабатывает выражение cron.
   * @param {string} expression Cron-выражение для задачи.
   * 
   * ```bash
   * # ┌──────────── Minute
   * # │ ┌────────── Hour
   * # │ │ ┌──────── Day of month
   * # │ │ │ ┌────── Month
   * # │ │ │ │ ┌──── Day of week
   * # │ │ │ │ │ ┌── Year
   * # │ │ │ │ │ │
   * # * * * * * *
   * ```
   * 
   * #### Например:
   * - `0 0 1 1 * *`         - Раз в год в полночь 1 января.
   * - `0 0 1 * * *`         - Раз в месяц в полночь первого дня месяца.
   * - `0 0 * * 0 *`         - Раз в неделю в полночь в воскресенье утром.
   * - `0 0 * * * *`         - Раз в день в полночь.
   * - `* * * * *`           - Каждую минуту.
   * - `*\/5 * * * *`        - Каждые 5 минут.
   * - `0 * * * * `          - Раз в час.
   * - `0 12 * * *`          - Каждый день в 12:00 (полдень).
   * - `15 10 * * *`         - Каждый день в 10:15 утра.
   * - `* 14 * * *`          - Каждую минуту, с 14:00 и до 14:59.
   * - `0-5 14 * * * `       - Каждую минуту, с 14:00 и до 14:05.
   * - `10,44 14 * 3 3`      - Каждую среду в марте, в 14:10 и в 14:44.
   * - `25 10 * * 1-5`       - Каждый пн, вт, ср, чт и пт в 10:25 утра.
   * - `25 10 15 * *`        - 15-го числа каждого месяца в 10:25 утра.
   * - `25 10 15 5 *`        - Каждый год 15 мая в 10:25.
   * - `0 0 * * 3`           - Каждую среду в полночь.
   * - `0 0 1,2 * *`         - 1-го, 2-го числа каждого месяца в полночь.
   * @param {string} functionName Имя функции, которую нужно выполнить.
   * @param {Object} [options] Дополнительные опции для задачи.
   * @param {string} [options.name] Название задачи.
   * @param {boolean} [options.scheduled = true] Запланирована ли задача.
   * @return {CronJob} Возвращает запланированную задачу.
   */
  schedule(expression, functionName, options = {}) {
    const job = this.newJob(expression, functionName, options);
    const jobs = this.getJobs();

    jobs.push(job);

    const value = jobs.map(job => job.valueOf());

    this._props.setProperty(this.PROPERTY_KEY_JOBS, JSON.stringify(value));

    return job;
  }



  /**
   * Возвращает коллекцию всех задач cron.
   * @return {CronJob[]} Коллекция объектов задач.
   */
  getJobs() {
    let jobs = this._props
      .getProperty(this.PROPERTY_KEY_JOBS) ?? "[]";

    try {
      jobs = JSON.parse(jobs);
    } catch (error) {
      jobs = [];
    }

    jobs = jobs.map(item => this.constructor.CronJob.fromEntries(item));

    return jobs;
  }



  /**
   * Очищает все запланированные задачи cron.
   * @return {void}
   */
  clearJobs() {
    return this._props
      .deleteProperty(this.PROPERTY_KEY_JOBS);
  }



  /**
   * Выполняет все задачи, запланированные на текущее время.
   * @return {*[]} Массив результатов выполнения задач.
   */
  run() {
    const result = [];
    const jobs = this.getJobs();

    if (!jobs.length) {
      return result;
    }

    const currentDate = new Date();
    const errors = [];

    for (const job of jobs) {
      if (!job.isDueAt(currentDate)) continue;

      try {
        result.push(job.run());
      } catch (error) {
        error = `[${job.id}${job.name ? "#" + job.name : ""}] ${error.message}`;
        console.error(error);
        errors.push(error);
        result.push(new Error(error));
      }
    }

    if (errors.length) {
      throw new Error(`Процесс cron завершился с ${errors.length} ${errors.length === 1 ? 'ошибкой' : 'ошибками'}.`);
    }

    return result;
  }

}





/**
 * @class               CronJob
 * @namespace           CronJob
 * @version             1.0.0
 */
Cron.CronJob = class CronJob {

  /**
   * Создает объект `CronJob` из массива записей.
   * @param {Array} input Массив с параметрами задачи.
   * @return {CronJob} Возвращает объект задачи `CronJob`.
   */
  static fromEntries(input) {
    return Reflect.construct(this, [
      // expression
      input[4],

      // functionName
      input[3],

      // options
      {
        id: input[0],
        name: input[1],
        scheduled: input[2],
        timezone: input[5],
      }
    ]);
  }



  /**
   * Конструктор задачи CronJob.
   * @param {string} expression Cron-выражение для задачи.
   * @param {string} functionName Имя функции для выполнения.
   * @param {Object} [options] Дополнительные опции для задачи.
   * @param {string} [options.name] Название задачи.
   * @param {boolean} [options.scheduled = true] Запланирована ли задача.
   * @param {string} [options.timezone] Часовой пояс для выполнения задачи.
   */
  constructor(expression, functionName, options = {}) {
    /**
     * @type {string}
     */
    this.id = String(options.id ?? new Date().getTime());


    if (typeof options.name === "string" && options.name.trim().length) {
      /**
       * @type {string}
       */
      this.name = options.name.trim();
    }


    /**
     * @type {string}
     */
    this.expression = expression;


    /**
     * @type {string}
     */
    this.functionName = functionName
      .replace(/\s+/g, "")
      .replace(/\.+/g, ".")
      .replace(/^\.|\.$/g, "");

    if (this.functionName.split('.').some(part => /^_.*|.*_$/g.test(part))) {
      throw new Error(`Параметр functionName не должен содержать части, начинающиеся или заканчивающиеся на "_".`);
    }


    /**
     * @type {boolean}
     */
    this.scheduled = true;

    if (typeof options.scheduled === "boolean") {
      this.scheduled = options.scheduled;
    }


    if (typeof options.timezone === "string" && Session.getScriptTimeZone() !== options.timezone) {
      /**
       * @type {string}
       */
      this.timezone = options.timezone;
    }
  }



  /**
   * Возвращает название задачи.
   * @return {string} Название задачи или `null`, если не установлено.
   */
  getName() {
    return (this.name ?? null);
  }



  /**
   * Устанавливает название задачи.
   * @param {string} name Новое название задачи.
   * @return {CronJob} Текущая задача с обновленным именем.
   */
  setName(name) {
    this.name = name;

    return this;
  }



  /**
   * Возвращает cron-выражение или запланированное время выполнения задачи.
   * @return {string} Cron-выражение или запланированное выполнения задачи.
   */
  getExpression() {
    // TODO: Реализовать метод `getExpression()`.
  }



  /**
   * Изменяет время выполнения задания.
   * @param {string} expression Cron-выражение или дата выполнения задачи.
   */
  setExpression(expression) {
    // TODO: Реализовать метод `setExpression()`.
  }



  /**
   * Возвращает текущий часовой пояс задачи.
   * @return {string} Часовой пояс задачи.
   */
  getTimeZone() {
    return (this.timezone ?? Session.getScriptTimeZone());
  }



  /**
   * Устанавливает новый часовой пояс для задачи.
   * @param {string} timezone Новый часовой пояс.
   * @return {CronJob} Текущая задача с обновленным часовым поясом.
   */
  setTimeZone(timezone) {
    // TODO: Реализовать метод `setTimeZone()`.
  }



  /**
   * Возвращает дату последнего выполнения задачи.
   * @return {Date} Дата последнего выполнения.
   */
  getPrevDate() {
    // TODO: Реализовать метод `getPrevDate()`.
  }



  /**
   * Возвращает дату следующего выполнения задачи.
   * @return {Date} Дата следующего выполнения.
   */
  getNextDate() {
    // TODO: Реализовать метод `getNextDate()`.
  }



  /**
   * Возвращает дату последнего выполнения задачи.
   * @return {Date} Дата последнего выполнения.
   */
  getLastDate() {
    // TODO: Реализовать метод `getLastDate()`.
  }



  /**
   * Добавляет название функции в коллекцию зарегистрированных функций.
   * @param {string} functionName Имя функции, которую нужно зарегистрировать.
   */
  addCallback(functionName) {
    // TODO: Реализовать метод `addCallback()`.
  }



  /**
   * Удаляет название функции из списка зарегистрированных функций.
   * @param {string} functionName Имя функции, которую нужно удалить.
   */
  removeCallback(functionName) {
    // TODO: Реализовать метод `removeCallback()`.
  }



  /**
   * Возвращает коллекцию зарегистрированных функций.
   * @return {string[]} Массив с именами зарегистрированных функций.
   */
  getCallbacks() {
    // TODO: Реализовать метод `getCallbacks()`.
  }



  /**
   * Запускает задачу, если она остановлена.
   * @return {CronJob} Текущая задача, запущенная для выполнения.
   */
  start() {
    if (this.scheduled !== true) {
      this.scheduled = true;

      // Обновляем задачи в хранилище
      const jobs = this._parent
        .getJobs()
        .map(job => job.id === this.id ? this : job);

      const value = jobs.map(job => job.valueOf());
      this._parent._props.setProperty(this._parent.PROPERTY_KEY_JOBS, JSON.stringify(value));
    }

    return this;
  }



  /**
   * Останавливает выполнение задачи.
   * @return {CronJob} Текущая задача, остановленная для выполнения.
   */
  stop() {
    if (this.scheduled !== false) {
      this.scheduled = false;

      // Обновляем задачи в хранилище
      const jobs = this._parent
        .getJobs()
        .map(job => job.id === this.id ? this : job);

      const value = jobs.map(job => job.valueOf());
      this._parent._props.setProperty(this._parent.PROPERTY_KEY_JOBS, JSON.stringify(value));
    }

    return this;
  }



  /**
   * Проверяет, запланирована ли задача на выполнение.
   * @return {boolean} `true`, если задача запланирована, иначе `false`.
   */
  isScheduled() {
    return (this.scheduled === true);
  }



  /**
   * Проверяет, должна ли задача выполниться в данный момент.
   * @return {boolean} `true`, если задача должна выполниться сейчас.
   */
  isDue() {
    return this.isDueAt(new Date());
  }



  /**
   * Проверяет, должна ли задача выполниться в указанное время.
   * @param {Date} time Время для проверки.
   * @return {boolean} `true`, если задача должна выполниться в указанное время.
   */
  isDueAt(time) {
    if (this.scheduled !== true) {
      return false;
    }

    if (!this._parsedExpression) {
      this._parsedExpression = Cron.parseExpression(this.expression);
    }

    const expression = this._parsedExpression;

    // TODO: Учесть timezone.

    return (
      expression.minutes.includes(time.getMinutes()) &&
      expression.hours.includes(time.getHours()) &&
      expression.daysOfMonth.includes(time.getDate()) &&
      expression.months.includes(time.getMonth() + 1) &&
      expression.daysOfWeek.includes(time.getDay()) &&
      (
        expression.years.length === 0 ||
        expression.years.includes(time.getFullYear())
      )
    );
  }



  /**
   * Выполняет функцию по строковому пути, используя `globalThis` как исходный контекст.
   * @return {*} Результат выполнения функции.
   */
  run() {
    // TODO: Если functionName массив или строка разделенная запятыми.
    const parts = this.functionName.split(".");

    let context, cursor;

    for (const [i, part] of parts.entries()) {
      // Начинаем с глобального контекста
      context = (cursor ?? globalThis);

      if (/^_.*|.*_$/g.test(part)) {
        throw new Error(`Свойство "${part}" защищено. Доступ к свойствам, начинающимся или заканчивающимся на "_" запрещен.`, {
          cause: {
            parts: parts.slice(0, i)
          }
        });
      }

      // Переходим по свойствам
      cursor = context[part];

      if (!(cursor && ["object", "function"].includes(typeof cursor))) {
        throw new Error(`Не найдено свойство "${part}" в "globalThis${i > 0 ? "." + parts.slice(0, i).join(".") : ""}".`, {
          cause: {
            parts: parts.slice(0, i)
          }
        });
      }
    }

    // Вызываем функцию с контекстом и аргументами.
    return cursor.apply(context, this);
  }



  /**
   * @return {Array}
   */
  valueOf() {
    return [
      this.id,
      (this.name ?? null),
      this.scheduled,
      (input => Array.isArray(input) ? input.join(",") : input)(this.functionName),
      this.expression,
      (this.timezone ?? null)
    ];
  }

};
