// A namespace defined for the sample code
// As a best practice, you should always define
// a unique namespace for your libraries
if(window.parent){
  window.parent.localStorage.setItem("firstLoadTime", new Date().getTime());
  window.parent.localStorage.setItem("firstLoadUrl", new Date().getTime());
}
var GlobalTab = window.GlobalTab || {};
(function () {
  // 清除是否来源客户视图标记
  window.localStorage.setItem("isFromAccountView", '')
  // 判断按钮是否初始化
  var btnInited = false
  // Define some global variables
  var globalContext = Xrm ? Xrm.Utility.getGlobalContext() : window.parent.Xrm.Utility.getGlobalContext();
  const clientContextName = globalContext.client?.getClient();
  var langId = globalContext.userSettings.languageId;
  // if (clientContextName == "Web") {
  // 移动端也加上水印
  if (clientContextName !== 1) {
    class WatermarkClass {
      constructor() {
        this.containerId = "watermarkContainer";
      }
      static DEFAULT_SETTINGS = {
        watermark_txt: "",
        watermark_x: 20,
        watermark_y: 20,
        watermark_rows: 0,
        watermark_cols: 0,
        watermark_x_space: 100,
        watermark_y_space: 50,
        watermark_font: "微软雅黑",
        watermark_color: "black",
        watermark_fontsize: "18px",
        watermark_alpha: 0.15,
        watermark_width: 150,
        watermark_height: 100,
        watermark_angle: 15,
      };
      mergeSettings(defaultSettings, settings = {}) {
        return { ...defaultSettings, ...settings };
      }
      createWatermarkDiv(text, x, y, settings) {
        const mask_div = top.document.createElement("div");
        mask_div.appendChild(top.document.createTextNode(text));

        mask_div.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            transform: rotate(-${settings.watermark_angle}deg);
            visibility: visible;
            opacity: ${settings.watermark_alpha};
            font-size: ${settings.watermark_fontsize};
            font-family: ${settings.watermark_font};
            color: ${settings.watermark_color};
            text-align: center;
            width: ${settings.watermark_width}px;
            height: ${settings.watermark_height}px;
            display: block;
            z-index: 9999;
            overflow: hidden;
        `;
        return mask_div;
      }

      loadMark(settings) {
        const defaultSettings = WatermarkClass.DEFAULT_SETTINGS;
        settings = this.mergeSettings(defaultSettings, settings);
        const page_width = Math.max(
          top.document.body.scrollWidth,
          top.document.body.clientWidth
        );
        const page_height = Math.max(
          top.document.body.scrollHeight,
          top.document.body.clientHeight
        );
        let container = top.document.getElementById(this.containerId);
        if (!container) {
          container = top.document.createElement("div");
          container.id = this.containerId;
          container.style.pointerEvents = "none";
          top.document.body.appendChild(container);
        }
        container.innerHTML = "";
        settings.watermark_cols =
          settings.watermark_cols ||
          parseInt(
            (page_width - settings.watermark_x + settings.watermark_x_space) /
              (settings.watermark_width + settings.watermark_x_space)
          );
        settings.watermark_x_space =
          settings.watermark_x_space ||
          parseInt(
            (page_width -
              settings.watermark_x -
              settings.watermark_width * settings.watermark_cols) /
              (settings.watermark_cols - 1)
          );
        settings.watermark_rows =
          settings.watermark_rows ||
          parseInt(
            (settings.watermark_y_space + page_height - settings.watermark_y) /
              (settings.watermark_height + settings.watermark_y_space)
          );
        settings.watermark_y_space =
          settings.watermark_y_space ||
          parseInt(
            (page_height -
              settings.watermark_y -
              settings.watermark_height * settings.watermark_rows) /
              (settings.watermark_rows - 1)
          );
        for (let i = 0; i < settings.watermark_rows; i++) {
          const y =
            settings.watermark_y +
            (settings.watermark_y_space + settings.watermark_height) * i;
          for (let j = 0; j < settings.watermark_cols; j++) {
            const x =
              settings.watermark_x +
              (settings.watermark_width + settings.watermark_x_space) * j;
            const mask_div = this.createWatermarkDiv(
              settings.watermark_txt,
              x,
              y,
              settings
            );
            container.appendChild(mask_div);
          }
        }
      }
      init(settings) {
        top.window.onload = () => {
          this.loadMark(settings);
        };
        top.window.onresize = () => {
          this.loadMark(settings);
        };
      }
      load(settings) {
        this.loadMark(settings);
      }
    }
    //撸个水印上去
    const watermark = new WatermarkClass();
    const userName = Xrm.Utility.getGlobalContext().userSettings?.userName;
    var watermarkConfig = {
      watermark_txt: userName,
      watermark_angle: 25,
      watermark_fontsize: "24px",
      watermark_alpha: 0.09,
      watermark_x_space: 200,
      watermark_y_space: 80,
      watermark_x: 100,
      watermark_y: 100,
    };
    if(clientContextName !== "Web"){
      watermarkConfig = {
        watermark_txt: userName,
        watermark_angle: 35,
        watermark_fontsize: "14px",
        watermark_alpha: 0.09,
        watermark_x_space: 40,
        watermark_y_space: 40,
        watermark_x: 20,
        watermark_y: 20,
        watermark_width: 110,
        watermark_height: 60,
      };
    }
    watermark.init(watermarkConfig);
    watermark.load(watermarkConfig);
  }
  //定时上报位置
  const timedReportLocation = async () => {
    const roles = Xrm.Utility.getGlobalContext().userSettings.roles.getAll();
    const isServiceEngineer = roles.some(
      (role) => role.name === "Service - Service Engineer"
    );
    if (!isServiceEngineer) return;
    const userId = Xrm.Utility.getGlobalContext().userSettings.userId.replace(
      /{|}/g,
      ""
    );
    const currPersonnels = await Xrm.WebApi.retrieveMultipleRecords(
      "mcs_personnel",
      `?$select=mcs_code&$filter=_mcs_systemuserid_value eq ${userId}`
    );
    const currPersonnel = currPersonnels?.entities?.[0];
    if (!currPersonnel) return;
    const personnelBind = `/mcs_personnels(${currPersonnel["mcs_personnelid"]})`;
    let timer = null;
    //五分钟一次
    const timeout = 5 * 60 * 1000;
    const getLocation = async () => {
      let location;
      if (clientContextName == "Mobile") {
        location = await Xrm.Device.getCurrentPosition();
      } else {
        location = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
      }
      return location;
    };
    const reportLocation = async () => {
      try {
        clearTimeout(timer);
        const location = await getLocation();
        if (location) {
          const data = {
            mcs_longitude: parseFloat(location.coords.longitude.toFixed(6)),
            mcs_latitude: parseFloat(location.coords.latitude.toFixed(6)),
            "mcs_engineer@odata.bind": personnelBind,
          };
          const storeTime = parseInt(localStorage.getItem("reportLocationTime") || '0');
          const nowTime = new Date().getTime();
          if(nowTime - storeTime >= 5 * 60 * 1000) {
            localStorage.setItem("reportLocationTime", nowTime);
            await Xrm.WebApi.createRecord("mcs_engineerpositionrecord", data);
            console.log(data, "上报位置完成");
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        timer = setTimeout(reportLocation, timeout);
      }
    };
    timer = setTimeout(reportLocation, 5000);
  };
  if (clientContextName == "Mobile") {
      timedReportLocation();
  }
  // 添加廉洁诚信按钮
  function addIntegrityReminderButton() {
    var win = window.parent;
    var  winXrm =  Xrm ? Xrm : window.parent.Xrm
    var id17 = win.document.getElementById("id-17");
    var id17Custom = win.document.getElementById('id-17-custom')
    if(id17 && !id17Custom){
      try{
        var title = langId=='2052'? '廉洁诚信' : 'Integrity Reporting';
        var title2 = langId=='2052'? '廉洁诚信举报渠道' : 'Integrity Reporting Channels';
        var tips = langId=='2052'? '点击查看廉洁诚信举报渠道' : 'Click to view Integrity Reporting Channels.';
        var button = document.createElement("div")
        button.className = "integrity-reporting"
        button.id = "id-17-custom"
        button.style.cursor = "pointer"
        button.style.paddingRight = "20px"
        // 在这里添加 title 属性，鼠标悬停时会显示提示
        button.innerHTML = '<a class="integrity-reporting-link" data-tooltip="' + tips + '">' + title + '</a></div>'
        button.addEventListener("click", function () {
          winXrm.Navigation.navigateTo(
            {
              pageType: "webresource",
              webresourceName: "mcs_/Htmls/IntegrityReminder.html",
              data: langId.toString(),
            },
            {
              title: title2,
              target: 2,
              position: 1,
              height: 250,
              width: clientContextName === "Mobile" ? 320 : 420,
            }
          );
        })
        id17.appendChild(button);
      }catch(e){
        console.log('addIntegrityReminderButton error', e)
      }
    }
  }

  // 修改 addGlobalFocusStyle 函数中的 CSS 样式
  function addGlobalFocusStyle() {
    // 创建 style 元素
    var style = document.createElement('style');
    style.type = 'text/css';
    style.id = 'custom-focus-style'; // 可选：用于防止重复添加

    // 设置 CSS 样式内容
    var css = `
      .integrity-reporting{
        padding-left: 20px;
        height: 48px;
      }
      .fui-FluentProvider .integrity-reporting{
        padding-left: 0;
      }
      .integrity-reporting-link {
        position: relative;
        color: #fff;
        line-height: 48px;
      }
      .integrity-reporting-link:hover{
        text-decoration: underline;
      }
      .integrity-reporting-link::after {
        content: attr(data-tooltip);
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: #fff;
        color: #242424;
        padding: 10px 8px;
        font-size: 12px;
        border-radius: 4px;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s, visibility 0.3s;
        z-index: 1000;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        font-size: 12px;
        line-height: 1.4;
        margin-bottom: 8px;
        margin-top: 10px;
      }

      .integrity-reporting-link::before {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 12px solid transparent;
        border-bottom-color: #fff;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s, visibility 0.3s;
        z-index: 1001;
        margin-top: -12px;
      }

      .integrity-reporting-link:hover::after,
      .integrity-reporting-link:hover::before {
        opacity: 1;
        visibility: visible;
      }

      .top-commandbar-wrap + li button:focus,
      .top-commandbar-wrap button:focus {
        background-color: transparent !important;
        outline: none !important;
      }
      .pa-w .top-commandbar-wrap .help-button{
        background: #fff!important;
        color: #e60012!important;
      }
      .help-button svg {
        width: 18px;
        height: 18px;
        margin-top: 1px;
      }
      .pa-w .top-commandbar-wrap .help-button svg {
        fill: #e60012;
      }
      .pa-af .top-commandbar-wrap .help-button{
        background: #083d8c!important;
      }
      .pa-af .top-commandbar-wrap .help-button svg {
        fill: #fff;
      }
    `;

    // 添加样式内容（兼容不同浏览器）
    if (style.styleSheet) {
      style.styleSheet.cssText = css; // IE 浏览器
    } else {
      style.appendChild(document.createTextNode(css));
    }

    // 插入到 window.parent 的 <head> 中
    if (window.parent && window.parent.document && window.parent.document.head) {
      window.parent.document.head.appendChild(style);
    }
  }

  // 隐藏助手按钮并修改帮助文档样式
  function assistantButtonChange(){
    var win = window.parent;
    // 添加全局样式
    addGlobalFocusStyle();
    // 添加廉洁诚信按钮
    addIntegrityReminderButton();
    // 获取助手按钮li标签
    var assistantBtn = win.document.getElementById('cardFeedContainerLauncher');
    // 获取帮助按钮li标签
    var helpBtnWrap = win.document.getElementById('helpLauncher');
    // 获取帮助按钮
    var helpBtn = win.document.getElementById('helpLauncher-button');

    // 处理隐藏
    if(assistantBtn){
      assistantBtn.style.cssText = `
        display: none!important;
      `
    }

    // 判断帮助按钮li标签是否存在
    if (helpBtnWrap) {
      helpBtnWrap.style.cssText = `
        margin-left: 8px;
        margin-right: 8px;
      `;
      const parent = helpBtnWrap.parentNode;
      if (parent) {
        parent.className += ' top-commandbar-wrap'
        // 将帮助按钮 li 标签移动到父元素的最后
        parent.append(helpBtnWrap);
    
        // 修改帮助按钮的样式和文字
        var text = langId === '2052' ? '帮助' : 'Help';
        helpBtn.className += ' help-button'
        helpBtn.style.cssText = `
          height: 30px;
          padding: 0 8px;
          display: flex;
          width: auto;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          line-height: 1.5rem;
        `;
        helpBtn.innerHTML = `
          <span style="display: flex; align-items: center; justify-content: center; gap: 2px;">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.99961 1.11304C5.85742 1.11304 4.74089 1.45173 3.79119 2.0863C2.8415 2.72087 2.1013 3.6228 1.66421 4.67804C1.22711 5.73328 1.11275 6.89444 1.33558 8.01468C1.55841 9.13492 2.10842 10.1639 2.91607 10.9716C3.72372 11.7792 4.75272 12.3292 5.87297 12.5521C6.99321 12.7749 8.15437 12.6605 9.20961 12.2234C10.2649 11.7863 11.1668 11.0461 11.8013 10.0965C12.4359 9.14676 12.7746 8.03022 12.7746 6.88804C12.7746 5.35641 12.1662 3.88752 11.0832 2.8045C10.0001 1.72147 8.53124 1.11304 6.99961 1.11304ZM7.36361 9.72304C7.24823 9.83194 7.09527 9.89212 6.93661 9.89104C6.85726 9.89258 6.77843 9.87785 6.70499 9.84775C6.63155 9.81765 6.56506 9.77283 6.50961 9.71604C6.45336 9.66165 6.40881 9.59634 6.37872 9.52412C6.34862 9.45189 6.33361 9.37427 6.33461 9.29604C6.33139 9.2175 6.34539 9.13922 6.37562 9.06667C6.40585 8.99411 6.45158 8.92905 6.50961 8.87604C6.56565 8.82051 6.63241 8.77698 6.70582 8.7481C6.77924 8.71921 6.85776 8.70558 6.93661 8.70804C7.01658 8.70503 7.09631 8.71839 7.17094 8.74727C7.24557 8.77616 7.31351 8.81998 7.37061 8.87604C7.42864 8.92905 7.47437 8.99411 7.5046 9.06667C7.53483 9.13922 7.54883 9.2175 7.54561 9.29604C7.5468 9.37701 7.53124 9.45736 7.49993 9.53204C7.46861 9.60672 7.4222 9.67413 7.36361 9.73004V9.72304ZM8.55361 6.50304C8.33257 6.73069 8.09886 6.9457 7.85361 7.14704C7.70967 7.26282 7.59264 7.40852 7.51061 7.57404C7.42001 7.74155 7.3742 7.92962 7.37761 8.12004V8.26004H6.50261V8.12004C6.4928 7.84882 6.55053 7.57942 6.67061 7.33604C6.91984 6.94246 7.23199 6.59247 7.59461 6.30004L7.73461 6.14604C7.8778 5.97746 7.95927 5.76513 7.96561 5.54404C7.96151 5.30347 7.86647 5.07338 7.69961 4.90004C7.60526 4.81444 7.49469 4.74865 7.37445 4.70657C7.25421 4.66449 7.12675 4.64696 6.99961 4.65504C6.84625 4.64221 6.69213 4.66819 6.55145 4.73058C6.41077 4.79297 6.28806 4.88976 6.19461 5.01204C6.0327 5.26117 5.95425 5.55536 5.97061 5.85204H5.13061C5.119 5.5959 5.15885 5.34004 5.24782 5.09958C5.3368 4.85911 5.47308 4.63892 5.64861 4.45204C5.8393 4.27121 6.06499 4.13135 6.31179 4.04106C6.55858 3.95077 6.82125 3.91196 7.08361 3.92704C7.5572 3.88652 8.02827 4.02935 8.39961 4.32604C8.56609 4.47315 8.69724 4.65592 8.78329 4.86075C8.86934 5.06557 8.90808 5.28717 8.89661 5.50904C8.89943 5.872 8.77845 6.22508 8.55361 6.51004V6.50304Z"/></svg><span>${text}</span>
          </span>
        `;
      }
    }
  }
  //打开form表单
  this.formClick = (executionContext) => {
    var pageInput = {
      pageType: "entitylist",
      entityName: "mcs_sany_feedback",
    };
    Xrm.Navigation.navigateTo(pageInput).then(
      function success() {
        // Run code on success
      },
      function error() {
        // Handle errors
      }
    );
  };
  //PC端旧按钮隐藏
  this.FeedBackBtnPcEnableRule = (formContext) => {
    return false;
  };
  //APP端旧按钮隐藏
  this.FeedBackBtnAppEnableRule = (formContext) => {
    return false;
  };
  //PC端按钮显示
  this.BtnPcEnableRule = (formContext) => {
    var clientContext = Xrm.Utility.getGlobalContext().client;
    var client = clientContext.getClient();
    return (isShow = client == "Web");
  };
  //APP端按钮显示
  this.BtnAppEnableRule = (formContext) => {
    var clientContext = Xrm.Utility.getGlobalContext().client;
    var client = clientContext.getClient();
    return (isShow = client == "Mobile");
  };

  this.IsServiceEngineer = () => {
    const roles = Xrm.Utility.getGlobalContext().userSettings.roles.getAll() || [];
    return roles.some((role) => role.name === "Service - Service Engineer")
  }

  // PC离线申请按钮显示规则
  this.OfflineApproveEnableRule = () => {
    setTimeout(assistantButtonChange, 500);
    if (this.IsServiceEngineer())  return this.BtnPcEnableRule()
    return false;
  };

  // 移动端离线申请按钮显示规则
  this.OfflineApproveEnableRuleMob = () => {
    if (this.IsServiceEngineer()) return this.BtnAppEnableRule()
    return false;
  };

  // 访问公告
  this.toAnnouncement = (formContext) => {
    Xrm.Navigation.navigateTo(
      {
        pageType: "webresource",
        webresourceName: "mcs_/Htmls/PC/Announcement/AnnouncementList.html",
      },
      {
        title: " ",
      }
    ).then(
      function success() {
        // Run code on success
      },
      function error() {
        // Handle errors
      }
    );
  };

  // 打开离线申请列表
  this.toOfflineApprove = () => {
    Xrm.Navigation.navigateTo({
      pageType: "entityrecord",
      entityName: "mcs_personnelofflineapprove",
    });
  };

  //打开form表单
  this.JobClick = (executionContext) => {
    var pageInput = {
      pageType: "entitylist",
      entityName: "mcs_otherjobs",
      viewId: "c193eca1-d371-ef11-a670-000d3aa11346",
    };
    Xrm.Navigation.navigateTo(pageInput).then(
      function success() {
        // Run code on success
      },
      function error() {
        // Handle errors
      }
    );
  };
  //岗位显示
  this.JobEnableRule = (formContext) => {
    return true;
  };

  xmlHttpRequest = (options) => {
    let { path, method = "POST", data, url } = options;
    if (data && method.toUpperCase() === "GET") {
      path +=
        "?" +
        Object.keys(data)
          .map((key) => key + "=" + data[key])
          .join("&");
    }
    return new Promise((resolve, reject) => {
      try {
        var req = new XMLHttpRequest();
        req.open(
          method,
          url,
          true
        );
        req.setRequestHeader("OData-MaxVersion", "4.0");
        req.setRequestHeader("OData-Version", "4.0");
        req.setRequestHeader("Accept", "application/json");
        req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        req.onreadystatechange = function () {
          if (this.readyState === 4) {
            req.onreadystatechange = null;
            if (this.status === 200) {
              resolve(this.response ? JSON.parse(this.response) : null);
            } else {
              resolve(null);
            }
          }
        };
        req.send(method === "POST" ? JSON.stringify(data) : null);
      } catch (e) {
        resolve(null);
      }
    });
  };

  // XMLHttpRequest请求封装
  this.httpRequest = (options = {}) => {
    var globalContext = window.parent.Xrm.Utility.getGlobalContext();
    return xmlHttpRequest({
      url: options.url || globalContext.getClientUrl() + "/api/data/v9.0/" + options.path,
      ...options
    });
  };

  // 接口调用
  this.fetchAPI = async function ({ Method = "post", fromPage = '', data  }) {
    var xrmGlobalContext = Xrm.Utility.getGlobalContext();
    var url = `${xrmGlobalContext.getClientUrl()}/api/data/v9.2/new_sfacommon`;
    var options = {
      method: "post",
      headers: {
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    };
    var response = await fetch(url, options);
    if (fromPage && fromPage === "esb") {
      return response.json();
    } else {
      if (!response.ok) {
        //可能是业务验证抛出的异常，这里直接抛出
        const errorDetails = await response.text();
        throw new Error(errorDetails);
      }
      return response.json();
    }
  };

  // 获取屏幕宽度
  this.getViewportWidth = () => {
    if (document.documentElement && document.documentElement.clientWidth) {
      return document.documentElement.clientWidth;
    } else if (window.innerWidth) {
      return window.innerWidth;
    }
    return 0;
  };

  // 打开公告弹窗
  const openNoticePopUp = async () => {
    const storageTime = localStorage.getItem("noticePopUpTime")
      ? parseInt(localStorage.getItem("noticePopUpTime"))
      : 0;
    const newDate = new Date();
    const nowTime = `${newDate.getFullYear()}${
      newDate.getMonth() + 1
    }${newDate.getDate()}`;
    // 24小时内不再弹窗
    if (storageTime > 0 && nowTime - storageTime < 1) {
      return;
    }
    const userId = Xrm.Utility.getGlobalContext()
      .userSettings.userId.replace(/[\{\}]/gi, "")
      .toLowerCase();
    const resp = await Promise.all([
      // 获取当前用户30天内的消息通知
      this.httpRequest({
        path: `mcs_ToReadImportantMessagesApi`,
      }),
      // 获取当前用户未读公告
      this.httpRequest({
        path: `mcs_ToReadAnnouncementsApi`,
        data: {
          AnnouncementType: "-1",
        },
      }),
    ]);
    // 未读公告和消息通知同时为空不显示弹窗
    const notifications =
      resp[0] && resp[0].Result ? JSON.parse(resp[0].Result) : [];
    const announcements =
      resp[1] && resp[1].Result ? JSON.parse(resp[1].Result) : [];
    let flag = 0;
    if (notifications.Results && notifications.Results.length > 0) {
      flag = 1;
    }
    if (announcements.Results && announcements.Results.length > 0) {
      flag = flag === 1 ? 3 : 2;
      // flag = 2;
    }
    // flag 0: 无公告和消息通知, 1: 仅有消息通知, 2: 仅有公告, 3: 公告和消息通知
    if (flag === 0) {
      return;
    }
    // 缓存上次弹窗时间
    localStorage.setItem("noticePopUpTime", nowTime);

    // 获取可视区域宽度
    const viewportWidth = this.getViewportWidth();

    // 获取客户端类型
    const clientContext = Xrm.Utility.getGlobalContext().client;
    let client = clientContext ? clientContext.getClient() : "";
    // if (client !== "Mobile") {
    //   client = viewportWidth < 1024 ? "Mobile" : "Web";
    // }

    // 打开弹窗, 应用内和web端弹窗不同样式
    Xrm.Navigation.navigateTo(
      {
        pageType: "webresource",
        webresourceName: "mcs_/Htmls/NoticePopUpNew.html",
        data: JSON.stringify({ flag }),
      },
      {
        title: " ",
        target: 2,
        position: 1,
        ...(client === "Mobile"
          ? {
              height: { value: 90, unit: "%" },
              width: { value: 90, unit: "%" },
            }
          : {
              height: { value: 90, unit: "%" },
              width: { value: 75, unit: "%" },
            }),
      }
    );
  };
  openNoticePopUp();

  // 集团埋点
  async function initTgpSDK(){
    var globalContext = Xrm ? Xrm.Utility.getGlobalContext() : window.parent.Xrm.Utility.getGlobalContext();
    var langId = globalContext.userSettings.languageId;
    var userName = globalContext.userSettings.userName;
    var clientContext = globalContext.client;
    var client = clientContext ? clientContext.getClient() : "";
    var userId = globalContext.userSettings.userId.replace(
      /{|}/g,
      ""
    );
    const currentUserData = await Xrm.WebApi.retrieveMultipleRecords(
      "systemuser",
      `?$select=domainname,fullname&$filter=systemuserid eq ${userId}`
    );
    const currentUser = currentUserData?.entities?.[0]??{};
    const domainName = currentUser?.domainname ?? ''
    const fullName = currentUser?.fullname ?? ''
    const currentPersonData =  await Xrm.WebApi.retrieveMultipleRecords(
      "mcs_personnel",
      `?$select=_mcs_countryid_value&$filter=_mcs_systemuserid_value eq ${userId}`
    );
    const currentPerson = currentPersonData?.entities?.[0]??{};
    const country = currentPerson?.['_mcs_countryid_value@OData.Community.Display.V1.FormattedValue'];
    const countryId = currentPerson?.['_mcs_countryid_value'];
    const ip = await getLocalIP();
    var script = document.createElement("script");
    script.src = "https://sanyglobal-img.sany.com.cn/d365/tgp_h5_sdk.min.js";
    var script2 = document.createElement("script");
    script2.type = "module"
    const code = `
      function getPagePerformanceData() {
        const perf = window.performance;
        if (!perf || !perf.timing) {
          console.warn("当前浏览器不支持 Performance API");
          return {};
        }

        const t = perf.timing;

        // 初始化性能数据对象
        const times = {};

        // 尝试通过 PerformanceObserver 获取 FMP（首屏时间）
        if (perf.getEntriesByType) {
          const paintEntries = perf.getEntriesByType('paint');
          if (paintEntries.length) {
            times.fmp = Math.round(paintEntries[paintEntries.length - 1].startTime);
          }
        }

        // 基础性能时间戳计算
        times.tti = Math.max(0, t.domInteractive - t.fetchStart); // 首次可交互时间
        times.ready = Math.max(0, t.domContentLoadedEventEnd - t.fetchStart); // HTML加载完成时间
        times.loadon = Math.max(0, t.loadEventStart - t.fetchStart); // 页面完全加载时间
        times.dns = Math.max(0, t.domainLookupEnd - t.domainLookupStart); // DNS查询耗时
        times.tcp = Math.max(0, t.connectEnd - t.connectStart); // TCP连接耗时
        times.ttfb = Math.max(0, t.responseStart - t.requestStart); // 首字节到达时间
        times.redirect = Math.max(0, t.redirectEnd - t.redirectStart); // 重定向时间

        // 保留两位小数
        Object.keys(times).forEach(key => {
          times[key] = parseFloat(times[key].toFixed(2));
        });

        return times;
      }


      // 上报成功回调，可根据实际业务调整，这里给到一种打印到控制台的方案
      const success = e => {
        console.log('onReportSuccess : ' + e);
        const resp = JSON.parse(e)
      };
      // 上报失败回调，可根据实际业务调整，这里给到一种打印到控制台的方案
      const fail = e => {
        console.log('onReportFail : ' + e);
      };
      window.pagePerformanceData = getPagePerformanceData();
      window.userInfo = {
        domainName:'${domainName}', 
        fullName: '${fullName}', 
        userName: '${userName}', 
        userId: '${userId}', 
        langId: '${langId}', 
        country: '${country}', 
        countryId: '${countryId}',
        ip: '${ip}'
      }
      window.beacon = new BeaconAction({
        appkey: 'MB66G3AQ2KWI5R0G', // 数据资源appkey, 必填
        reportUrl: 'https://ubap-report.sany.com.cn/logserver/analytics/upload?tp=js', // 默认为 SAAS 服务的上报地址，私有化客户请在此传入您的上报地址
        versionCode: '', //项目版本, 选填, 不设置会走默认配置
        channelID: 'd365_${client}', //渠道, 选填, 不设置会走默认配置
        openid: '${userId}_${ip}', // 用户 id, 选填, 不设置会走默认配置；上报到平台后对应为uid字段
        delay: 5000, // 普通事件延迟上报时间(单位毫秒), 默认 5000(5 秒),选填
        maxDBCount: 10000, // 最大存储条数, 默认 10000(条), 设置区间10000-50000,选填
        sessionDuration: 30 * 60 * 1000, // session 变更的时间间隔, 一个用户持续 30 分钟(默认值)没有 任何上报则算另一次 session, 每变更一次session上报一次启动事件(rqd_applaunched),使用毫秒 (ms), 最小值 30 秒, 选填, 不设置会走默认配置
        onReportSuccess: success, // 上报成功回调, 选填, 不设置会走默认配置
        onReportFail: fail, // 上报失败回调, 选填, 不设置会走默认配置
      });

      var baseData = {
          user_id: '${userId}',
          user_name: '${userName}', 
          user_country:  '${country}', 
          user_country_id: '${countryId}',
          user_domainname: '${domainName}',
          user_fullname: '${fullName}',
          language_id: '${langId}', 
      }

      function formatDateTime(date) {
        if(!date) return '';
        let t = new Date(date);
        function formatNumber(num) {
          return (num < 10 ? '0' : '') + num;
        }
        return t.getFullYear() + '-' + formatNumber(t.getMonth() + 1) + '-' + formatNumber(t.getDate()) + ' ' + formatNumber(t.getHours()) + ':' + formatNumber(t.getMinutes()) + ':' + formatNumber(t.getSeconds());
      }

      /**
       * 页面加载时长上报
       * @param dataObj { form_onload_time: '窗体加载时间', async_load_time: '异步处理时间'，form_name: '窗体名称', form_id: '窗体ID' }
       * @returns 
       */
      window.pageLoadReport = function(dataObj){
          if(typeof dataObj !== 'object') return ;
          window.beacon.onUserAction('page_load', {
              ...baseData,
              first_page_bit_back_time: window.pagePerformanceData?.fmp ?? '',
              first_page_loaded_time: window.pagePerformanceData?.loadon ?? '',
              ...dataObj
          })
      }


      /**
       * 接口加载时长上报
       * @param dataObj { api_load_time： 'api加载时长', api_name：'页面接口名称', api_url: '页面接口地址' }
       * @returns 
       */
      window.apiLoadReport = function(dataObj){
          if(typeof dataObj !== 'object') return ;
          window.beacon.onUserAction('page_api_load_time', {
              ...baseData,
              ...dataObj
          })
      }

      /**
       * 用户行为事件上报
       * @param dataObj { module_name: "模块名称", menu_name: "菜单名称", page_name: "页面名称", behaviour_name: "操作/按钮名称", behaviour_start_time: "开始时间", behaviour_end_time: "结束时间" }
       * @returns 
       */
      window.userBehaviorReport = function(dataObj){
          if(typeof dataObj !== 'object') return ;
          window.beacon.onUserAction('user_behaviour', {
              user_id: '${userId}',
              user_name: '${userName}', 
              user_country:  '${country}', 
              user_domainname: '${domainName}',
              ...dataObj,
              behaviour_duration: dataObj.behaviour_end_time && dataObj.behaviour_start_time ? new Date(dataObj.behaviour_end_time).getTime() - new Date(dataObj.behaviour_start_time).getTime() : 0,
              behaviour_start_time: formatDateTime(dataObj.behaviour_start_time),
              behaviour_end_time: formatDateTime(dataObj.behaviour_end_time)
          })
      }

      function hijackFetch() {
        const originalFetch = window.fetch;
        window.fetch = function (input, init) {
          const startTime = performance.now();
          const url = typeof input === 'string' ? input : input.url;

          // appendToNetwork('OUTGOING', url, 'fetch');

          return originalFetch(input, init).then(response => {
            const duration = Math.round(performance.now() - startTime);
            appendToNetwork(duration, url);
            return response;
          }).catch(err => {
            // appendToNetwork('ERROR:' + err.message , url, 'error');
          });
        };
      }

      function getURLParam(name) {
        var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)"); //构造一个含有目标参数的正则表达式对象
        var r = window.location.search.substr(1).match(reg); //匹配目标参数
        if (r !== null) return unescape(r[2]); return null; //返回参数值
      }


      function appendToNetwork(duration, apiUrl) {
        try{
          const entityName = getURLParam('etn')
          const pageType = getURLParam('pagetype')
          if(apiUrl && entityName && pageType==='entitylist' &&  apiUrl.indexOf(entityName) > -1 && apiUrl.indexOf('?fetchXml=') > -1 ){
            window.beacon.onUserAction('page_list_load_time', {
                api_load_time: duration,
                api_name: entityName + '列表',
                api_url: apiUrl ? apiUrl.split('?')[0] : '',
                user_id: '${userId}',
                user_name: '${userName}',
                user_country:'${country}',
                user_domainname: '${domainName}',
                user_fullname: '${fullName}',
            })
          }
        }catch(e){
          console.log('page_list_load_time error', e)
        }
      }
      hijackFetch()
      `    
    try {
      script2.appendChild(document.createTextNode(code));
    } catch (err) {
      script2.text = code;
    }
    if(window.parent && window.parent.document) {
      window.parent.document.body.appendChild(script);
      script.onload = function () {
        window.parent.document.body.appendChild(script2);
      };
    }
  }
  function initFireBase() {
    addFloatButton();
    addPageTitle();
    initTgpSDK();
    var script = document.createElement("script");
    // script.src = src;
    script.type = "module";
    var code = `
        import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js'
        import { getAnalytics, logEvent } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-analytics.js'
        import { getAuth } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js'
        import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js'
        const k = 'Key';
        const keyContent = 'UjkhJGvSgxjRuaop01s38r';
        var firebaseConfig = {
            ['api' + k]: "AIzaSyA02"+keyContent+"Y7yNqT50",
            authDomain: "sany-icrm.firebaseapp.com",
            projectId: "sany-icrm",
            storageBucket: "sany-icrm.firebasestorage.app",
            messagingSenderId: "547532848661",
            appId: "1:547532848661:web:61002affa8033a63b5981c",
            measurementId: "G-EJD1H9WPPT",
        };
        var app = initializeApp(firebaseConfig)
        var analytics = getAnalytics(app)
        window.logEvent = logEvent
    `;
    
    try {
      script.appendChild(document.createTextNode(code));
    } catch (err) {
      script.text = code;
    }
    if(window.parent && window.parent.document) {
      window.parent.document.body.appendChild(script);
    }
  }

  var aiLangMap = {
    1025: 'مساعد صيانة وتشغيل CRM للخارج',
    1031: 'CRM-Betriebsassistent International',
    1033: 'CRM Operations and Maintenance Assistant',
    1036: `Assistant d'exploitation et maintenance CRM pour'`,
    1040: `Assistente Operativo e Manutenzione CRM per l'Estero'`,
    1046: 'Assistente de Operação e Manutenção CRM no Exterior',
    1049: 'Помощник по эксплуатации и обслуживанию CRM для зарубежных операций',
    1054: 'ผู้ช่วยปฏิบัติการและบำรุงรักษา CRM ต่างประเทศ',
    1057: 'Asisten Operasi dan Pemeliharaan CRM Luar Negeri',
    1066: 'Trợ lý Vận hành và Bảo trì CRM Hải ngoại',
    2052: '海外CRM运维助手',
    3082: 'Asistente de Operaciones y Mantenimiento de CRM para el Extranjero'
  };
  var langMap = {
    2052: 'zh-CN',
    1033: 'en-US',
  }

  var lang = langMap[langId] || 'en-US';
  // 获取ai运维机器人url
  const getAIUrl = async () => {
    try{
      const userId = Xrm.Utility.getGlobalContext().getUserId().replace(/[\{\}]/ig, "");
      const res = await this.fetchAPI({
        // Path: '/api/Jwt/CreateJwt',
        data: {
          Api: 'SfaCommon/CreateJwt',
          Input: JSON.stringify({
              request:JSON.stringify({
                UserId: userId,
                DataSource: ''
              })
          })
        }
      }) || {};
      const result = res.Output ? JSON.parse(JSON.parse(res.Output)) : {};

      let baseUrl = '';
      let agentId = '';

      if (
        window.location.host.indexOf('sany-uat.') > -1 || 
        window.location.host.indexOf('dev1.') > -1 || 
        window.location.host.indexOf('pre.crm5') > -1
      ) {
          baseUrl = `https://ai-test.sany.com.cn`;
          agentId = '670044987874658'
      } else {
          // 正式环境
          baseUrl = 'https://ai-agent.sany.com.cn';
          agentId = '674099290413105'
      }

      return `${baseUrl}/client/maintenance-assistant/login?agentId=${agentId}&token=${result.strToken}&client=true&language=${lang}`;
    } catch(err) {
      console.log(err)
      return ''
    }
  }
  
  // 添加ai机器人浮动入口按钮
  function addFloatButton() {
    const clientContext = Xrm.Utility.getGlobalContext().client;
    let client = clientContext ? clientContext.getClient() : "";
    let time = null;
    if (client === "Mobile") {
      return;
    }

    var button = document.createElement("div");
    button.className = 'float-ai-button'
    button.style.cssText = `
      position: fixed;
      right: 30px;
      bottom: 80px;
      width: 50px;
      height: 50px;
      z-index: 0;
      cursor: pointer;
      background: url(https://sanyglobal-img.sany.com.cn/inquiry-admin/20250513/ai-bot0_084131.png) center center / cover;
    `;

    // 创建侧边栏容器
    var sidebar = document.createElement("div");
    sidebar.className = 'sidebar';
    sidebar.style.cssText = `
      position: fixed;
      top: 0;
      right: -500px;
      bottom: 0;
      width: 500px;
      background-color: white;
      z-index: 9999;
      transition: right 0.3s ease;
      border-left: 1px solid #f0f0f0;
      color: #333;
    `
    sidebar.innerHTML = `
        <div class="sidebar-title" style="
          line-height: 50px; 
          font-size: 16px;  
          padding-left: 16px; 
          width: calc(100% - 54px);
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis;
        ">
          ${aiLangMap[langId || 1033]}
        </div>
    `;

    // 创建iframe
    var iframe = document.createElement("iframe");
    iframe.id = "sidebar-iframe";
    iframe.src = "";
    iframe.style.cssText = `
        width: 100%;
        height: calc(100% - 50px);
        border: none;
        border-top: 1px solid #f0f0f0;
        background-color: #f8f8f8;
    `;
    
    // 创建关闭按钮
    var sidebarClose = document.createElement("div");
    sidebarClose.className = 'sidebar-close';
    sidebarClose.style.cssText = `
        position: absolute;
        top: 0px;
        right: 0px;
        padding: 6px 10px;
        font-size: 30px;
        line-height: 1;
        cursor: pointer;
    `;
    sidebarClose.innerHTML = "×";
    sidebarClose.addEventListener('click', () => {
        closeSidebar();
    });

    sidebar.appendChild(iframe);
    sidebar.appendChild(sidebarClose);

    // 打开侧边栏
    function openSidebar() {
        sidebar.style.right = "0";
    }

    // 关闭侧边栏
    function closeSidebar() {
        sidebar.style.right = "-500px";
        var nowTime = new Date().getTime();
        sendBeacon(nowTime - time)
    }

    function sendBeacon(visitDuration) {
      if (window.parent && window.parent.beacon) {
        var userInfo = window.parent?.userInfo ?? {}
        var globalContext = Xrm ? Xrm.Utility.getGlobalContext() : window.parent.Xrm.Utility.getGlobalContext();
        var userName = globalContext.userSettings.userName;
        var userId = globalContext.userSettings.userId.replace(
            /{|}/g,
            ""
        );
        window.parent.beacon.onUserAction('iframe_page_visit_record', {
            user_id: userId,
            user_name: userName,
            user_country: userInfo?.country ?? '',
            user_country_id: userInfo?.countryId ?? '',
            user_domainname: userInfo?.domainName ?? '',
            user_fullname: userInfo?.fullName ?? '',
            form_name: "运维助手",
            visit_duration: visitDuration,
        })
      }
    }

    // 浮动按钮点击事件
    button.addEventListener('click', async (e) => {
      e.stopPropagation();
      openSidebar();
      var url = await getAIUrl();
      iframe.src = url;
      time = new Date().getTime();
    });

    // 拖动事件
    let isDragging = false;
    let offsetX, offsetY;

    // 鼠标事件
    button.addEventListener('mousedown', (e) => {
        // isDragging = true;
        isDragging = false;
        offsetX = e.clientX - button.offsetLeft;
        offsetY = e.clientY - button.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            button.style.left = (e.clientX - offsetX) + 'px';
            button.style.top = (e.clientY - offsetY) + 'px';
            button.style.right = 'auto';
            button.style.bottom = 'auto';
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // 触摸事件
    button.addEventListener('touchstart', (e) => {
        // isDragging = true;
        isDragging = false;
        const touch = e.touches[0];
        offsetX = touch.clientX - button.offsetLeft;
        offsetY = touch.clientY - button.offsetTop;
    });

    document.addEventListener('touchmove', (e) => {
        if (isDragging) {
            const touch = e.touches[0];
            button.style.left = (touch.clientX - offsetX) + 'px';
            button.style.top = (touch.clientY - offsetY) + 'px';
            button.style.right = 'auto';
            button.style.bottom = 'auto';
        }
    });

    document.addEventListener('touchend', () => {
        isDragging = false;
    });

    if(window.parent && window.parent.document) {
      var warp = window.parent.document.getElementById('ApplicationShell');

      if(warp){
        warp.appendChild(button);
        window.parent.document.body.appendChild(sidebar);
      }

    }
  }

  function getPageName(){
    var host = window.location.host;
    var name = [];
    if(host.indexOf('dev1.') > -1){
      return 'DEV'
    } else if(host.indexOf('sany-uat.') > -1){
      name.push('UAT');
    } else if(host.indexOf('sany.') > -1){
      name.push('PROD');
    }
    if(host.indexOf('.crm.dynamics.com') > -1){
      name.push('CRM');
    } else if(host.indexOf('.crm5.dynamics.com') > -1){
      name.push('CRM5');
    } else if(host.indexOf('.crm4.dynamics.com') > -1){
      name.push('CRM4');
    }
    return name.join('-');
  }

  // 操作菜单栏标题
  function addPageTitle() {
    setTimeout(()=>{
      if(window.parent){
        window.parent.addEventListener('resize', () => handlePageTitleAdd(window.parent))
        handlePageTitleAdd(window.parent)
      } else {
        console.log('document null')
      }
    }, 3000)
  }
  function setHidden(elem){
    elem.innerHTML = ``
    elem.style.cssText = `
        display: none!important;`
  }

  // 增加环境标题配置
  function handlePageTitleAdd(win) {
    var node18 = win.document.getElementById('id-18');
    var node19 = win.document.getElementById('id-19');
    var nodeEnvText = win.document.getElementById('env-text');
    if(node19){
      setHidden(node19)
    } 
    if(nodeEnvText){
      nodeEnvText.innerHTML = getPageName();
      return 
    }
    var newNode = document.createElement('div');
    newNode.id = 'env-text'
    newNode.className = 'pa-f flexbox';
    newNode.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: flex-end;
      margin-top: 0px;
      font-size: 14px;
      position: absolute;
      left: 0;
      height: 100%;
      top: 0;
      width: 80px;
    `;
    node18.parentNode.style.cssText=`
      position: relative;
      padding-left: 90px;
    `;
    newNode.innerHTML = getPageName();
    node18.parentNode.insertBefore(newNode, node18)
      
  }
  
  setTimeout(initFireBase, 500);

  const openVersionPopup = async () => {
    // ----------版本弹窗------------
    // 获取大区
    var globalContext = Xrm ? Xrm.Utility.getGlobalContext() : window.parent.Xrm.Utility.getGlobalContext();
    var clientContext = globalContext.client;
    // var userId = globalContext.userSettings.userId.replace(/{|}/g, "");
    try {
    //   const currPersonnels = await Xrm.WebApi.retrieveMultipleRecords(
    //     "mcs_personnel",  
    //     `?$select=mcs_region&$filter=_mcs_systemuserid_value eq ${ userId}` 
    //   );
    //   const currentPerson = currPersonnels?.entities?.[0] ?? {};
    //   const regionId = currentPerson?.['_mcs_region_value'];
    //   if (!regionId) return;
    //   var str = `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">
    //     <entity name="mcs_functionsetting">
    //       <attribute name="mcs_closepowerapps" />
    //       <filter type="and">
    //         <condition attribute="statecode" operator="eq" value="0" />
    //         <condition attribute="mcs_regionid" operator="eq" value="${regionId}" />
    //       </filter>
    //     </entity>
    //   </fetch>`

    //   const popupConfigData = await Xrm.WebApi.retrieveMultipleRecords("mcs_functionsetting", `?fetchXml=${str}`);
    //   const popupConfig = popupConfigData?.entities?.[0] ?? {};
      // const canClose = !popupConfig.mcs_closepowerapps;

      // 获取当前环境信息
      const isProduction = !(window.location.host.indexOf('sany-uat.') > -1 ||
        window.location.host.indexOf('dev1.') > -1 ||
        window.location.host.indexOf('pre.crm5') > -1);

      // 获取客户端下载链接
      const iosUrl = isProduction
        ? 'https://apps.apple.com/cn/app/sany-icrm/id6636481631'
        : 'https://testflight.apple.com/join/kK5njCj4';
      const androidUrl = isProduction
        ? 'https://store.sany.com.cn/sany-store-bmanagerh5/dist/#/download?app_id=10001298'
        : 'https://www.pgyer.com/wNAzehvd';
      const iosImgUrl = isProduction
        ? '/WebResources/mcs_global_tabs_ios_pro'
        : '/WebResources/mcs_global_tabs_ios_dev';
      const androidImgUrl = isProduction
        ? '/WebResources/mcs_global_tabs_android_pro'
        : '/WebResources/mcs_global_tabs_android_dev';

      var popupAndroidLangMap = {
        1033: 'Download Android Version',
        2052: '下载Android客户端',
      };
      var popupIosLangMap = {
        1033: 'Download iOS Version',
        2052: '下载iOS客户端',
      };
      var popupQrLangMap = {
        1033: 'Please scan the QR code with your mobile phone to download the latest ICRM App.',
        2052: '请使用手机扫码下载最新ICRM App',
      };

      var popupAndroidLang = popupAndroidLangMap[langId || 1033]
      var popupIosLang = popupIosLangMap[langId || 1033]
      var popupQrLang = popupQrLangMap[langId || 1033]
      let popupHtml = '';
      if(document.getElementById('versionPopup')) document.getElementById('versionPopup').remove();
      if (clientContext && clientContext.getClient && clientContext.getClient() === "Mobile") {
        // if (canClose) {
        //   // 检查是否已经显示过弹窗
        //   const hasShown = window.parent.localStorage.getItem("versionPopupShown");
        //   if (hasShown === "true") {
        //     return;
        //   }
        //   window.parent.localStorage.setItem("versionPopupShown", "true");
        //   // 可关闭弹窗且之前没有弹过，背景为offline-0.png
        //   popupHtml = `
        //     <div id="versionPopup" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%;z-index: 9999; display: flex; justify-content: center; align-items: center;">
        //       <div style="background: url('https://sanyglobal-img.sany.com.cn/d365/crm/offline-0.png') center center / cover no-repeat, rgba(0, 0, 0, 0.5); padding: 0; border-radius: 16px; width: 345px; max-width: 90vw; position: relative; opacity: 0.97; box-shadow: 0 4px 24px rgba(0,0,0,0.10); display: flex; flex-direction: column; align-items: center; justify-content: flex-end; min-height: 250px; min-width: 320px;">
        //         <div style="position: absolute; top: 16px; right: 16px; cursor: pointer; font-size: 22px; color: #999; z-index:2;" onclick="document.getElementById('versionPopup').remove(); localStorage.setItem('versionPopupShown', 'true');">×</div>
        //         <div style="width: 80%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 36px; position: relative; z-index:1;">
        //           <a href="${androidUrl}"
        //             target="_blank"
        //             style="display: block; width: 140px; height: 28px; line-height: 28px; text-align: center; background: #fff; color: #4866FA; border-radius: 12px; text-decoration: none; font-size: 14 px; font-weight: 600; margin-bottom: 18px; box-shadow: 0 2px 8px rgba(34,83,230,0.08); border: none;">
        //             ${popupAndroidLang}
        //           </a>
        //           <a href="${iosUrl}"
        //             target="_blank"
        //             style="display: block; width: 114px; height: 28px; line-height: 28px; text-align: center; background: #fff; color: #4866FA; border-radius: 12px; text-decoration: none; font-size: 14px; font-weight: 600; margin-bottom: 0; box-shadow: 0 2px 8px rgba(34,83,230,0.08); border: none;">
        //             ${popupIosLang}
        //           </a>
        //         </div>
        //       </div>
        //     </div>
        //   `;
        // } else {
          // 不可关闭弹窗，背景为offline-1.png，全屏覆盖
          popupHtml = `
            <div id="versionPopup" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: url('https://sanyglobal-img.sany.com.cn/d365/crm/offline-1.png') center center / cover no-repeat, #fff; z-index: 9999; display: flex; flex-direction: column; justify-content: flex-end; align-items: center;">
              <div style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 48px; position: relative; z-index:1;">
                <a href="${androidUrl}"
                  target="_blank"
                  style="display: block; width: 190px; height: 40px; line-height: 40px; text-align: center; background: #fff; color: #4866FA; border-radius: 12px; text-decoration: none; font-size: 18px; font-weight: 600; margin-bottom: 18px; box-shadow: 0 2px 8px rgba(34,83,230,0.08); border: none;">
                  ${popupAndroidLang}
                </a>
                <a href="${iosUrl}"
                  target="_blank"
                  style="display: block; width: 154px; height: 40px; line-height: 40px; text-align: center; background: #fff; color: #4866FA; border-radius: 12px; text-decoration: none; font-size: 18px; font-weight: 600; margin-bottom: 0; box-shadow: 0 2px 8px rgba(34,83,230,0.08); border: none;">
                  ${popupIosLang}
                </a>
              </div>
            </div>
          `;
        // }
      // } else {
        // // 检查是否已经显示过弹窗
        // const hasShown = window.parent.localStorage.getItem("versionPopupShown");
        // if (hasShown === "true") {
        //   return;
        // }
        // window.parent.localStorage.setItem("versionPopupShown", "true");
        // // PC端弹窗，二维码展示
        // popupHtml = `
        //   <div id="versionPopup" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%;z-index: 9999; display: flex; justify-content: center; align-items: center;">
        //     <div style="background: white; padding: 32px 24px 24px 24px; border-radius: 10px; width: 95%; max-width: 520px; position: relative; box-shadow: 0 4px 24px rgba(0,0,0,0.10); opacity: 0.97;">
        //       <div style="position: absolute; top: 16px; right: 16px; cursor: pointer; font-size: 20px; color: #999;" onclick="document.getElementById('versionPopup').remove(); localStorage.setItem('versionPopupShown', 'true');">×</div>
        //       <div style="font-size: 22px; font-weight: bold; color: #333; text-align: center; margin-bottom: 18px;">ICRM App 下载</div>
        //       <div style="display: flex; justify-content: space-around; align-items: flex-start; gap: 24px;">
        //         <div style="text-align: center;">
        //           <div style="margin-bottom: 8px; font-size: 16px;">iOS</div>
        //           <img src="${iosImgUrl}" alt="iOS二维码" style="width:150px;height:150px;"/>
        //           <div style="margin-top: 8px; font-size: 12px; color: #888; word-break: break-all;">${iosUrl}</div>
        //         </div>
        //         <div style="text-align: center;">
        //           <div style="margin-bottom: 8px; font-size: 16px;">Android</div>
        //           <img src="${androidImgUrl}" alt="Android二维码" style="width:150px;height:150px;"/>
        //           <div style="margin-top: 8px; font-size: 12px; color: #888; word-break: break-all;">${androidUrl}</div>
        //         </div>
        //       </div>
        //       <div style="margin-top: 24px; text-align: center; color: #666; font-size: 15px;">${popupQrLang}</div>
        //     </div>
        //   </div>
        // `;
      }

      if (window.parent && window.parent.document) {
        var warp = window.parent.document.getElementById('ApplicationShell');
        if (warp) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = popupHtml;
          window.parent.document.body.appendChild(tempDiv.firstElementChild);
        }
      }
    } catch (error) {
      console.error('Error retrieving personnel data:', error);
    }
  }
  openVersionPopup()

  // 生成二维码侧边栏
  function downloadQrCodeSidebar() {
    // 获取当前环境信息
    const isProduction = !(window.location.host.indexOf('sany-uat.') > -1 ||
      window.location.host.indexOf('dev1.') > -1 ||
      window.location.host.indexOf('pre.crm5') > -1);

    // 获取客户端下载链接
    const iosImgUrl = isProduction
      ? '/WebResources/mcs_global_tabs_ios_pro'
      : '/WebResources/mcs_global_tabs_ios_dev';
    const androidImgUrl = isProduction
      ? '/WebResources/mcs_global_tabs_android_pro'
      : '/WebResources/mcs_global_tabs_android_dev';
    
    // 获取语言ID
    var globalContext = Xrm ? Xrm.Utility.getGlobalContext() : window.parent.Xrm.Utility.getGlobalContext();
    var langId = globalContext.userSettings.languageId;
    
    // 双语标题映射
    var titleLangMap = {
      1033: 'ICRM Mobile App Download',
      2052: 'ICRM移动端下载',
    };
    
    var title = titleLangMap[langId || 1033];
    
    var qrCodeSidebar = document.createElement("div");
    qrCodeSidebar.className = 'qrcode-sidebar';
    qrCodeSidebar.style.cssText = `
      position: fixed;
      bottom: 0;
      right: -500px;
      bottom: 0;
      width: 500px;
      background-color: white;
      z-index: 9999;
      transition: right 0.3s ease;
      border-left: 1px solid #f0f0f0;
      color: #333;
      padding: 20px;
      box-sizing: border-box;
      height: 100%;
    `
    
    // 关闭二维码侧边栏
    var closeQrCodeSidebar = () => {
      console.log('关闭二维码侧边栏',qrCodeSidebar.style.right);
      // qrCodeSidebar.style.right = "-500px";
    }
    var checkClick = ()=>{
      qrCodeSidebar.style.right = "-500px";
    }
    // 打开二维码侧边栏
    var openQrCodeSidebar = () => {
      qrCodeSidebar.style.right = "0";
    }
  
    qrCodeSidebar.innerHTML = `
      <div class="sidebar-header" id="sidebar-header" style="text-align: center; margin-bottom: 30px; position: relative;">
        <div style="position: absolute; top: 0; right: 0; cursor: pointer; font-size: 24px; color: #999; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;" onclick="this.parentElement.parentElement.style.right='-500px'">×</div>
        <h2 style="margin: 0; color: #333; font-size: 24px; font-weight: bold;">${title}</h2>
      </div>
      <div class="sidebar-content" style="display: flex; flex-direction: column; align-items: center; gap: 30px;">
        <div style="text-align: center;">
          <h3 style="margin: 0 0 15px 0; color: #666; font-size: 18px;">iOS</h3>
          <img src="${iosImgUrl}" alt="iOS二维码" style="width:150px;height:150px;"/>
        </div>
        <div style="text-align: center;">
          <h3 style="margin: 0 0 15px 0; color: #666; font-size: 18px;">Android</h3>
          <img src="${androidImgUrl}" alt="Android二维码" style="width:150px;height:150px;"/>
        </div>
      </div>
    `
    if (window.parent && window.parent.document) {
      var warp = window.parent.document.getElementById('ApplicationShell');
      if (warp) {
        // const tempDiv = document.createElement('div');
        // tempDiv.innerHTML = qrCodeSidebar;
        window.parent.document.body.appendChild(qrCodeSidebar);
      }
    }
    return {
      qrCodeSidebar,
      closeQrCodeSidebar,
      openQrCodeSidebar,
    };
  }
  
  this.openQrCodeSidebar = () => {
    
    // 检查是否已存在侧边栏
    let existingSidebar = null;
    if (window.parent && window.parent.document) {
      existingSidebar = window.parent.document.querySelector('.qrcode-sidebar');
    }
    
    if (existingSidebar) {
      // 如果侧边栏已存在，切换显示/隐藏
      const currentRight = existingSidebar.style.right;
      if (currentRight === '0px' || currentRight === '') {
        // 当前是显示状态，隐藏它
        existingSidebar.style.right = '-500px';
      } else {
        // 当前是隐藏状态，显示它
        existingSidebar.style.right = '0px';
      }
    } else {
      // 如果侧边栏不存在，创建新的
      var { qrCodeSidebar, openQrCodeSidebar } = downloadQrCodeSidebar();
      if (window.parent && window.parent.document) {
        var warp = window.parent.document.getElementById('ApplicationShell');
        if (warp) {
          window.parent.document.body.appendChild(qrCodeSidebar);
        }
      }
      openQrCodeSidebar();
      console.log('创建并显示新侧边栏');
    }
  }
  
  //显示二维码按钮
  this.QrCodeEnableRule = (formContext) => {
    return this.BtnPcEnableRule();
  };

  async function getLocalIP() {
    try{
      var localIp = window.localStorage.getItem('localIp');
      if(localIp){
        return Promise.resolve(localIp);
      }
      const response = await fetch('https://ifconfig.me/ip');
      const ip = await response.text();
      window.localStorage.setItem('localIp', ip);
      return ip;
    } catch (error) {
      console.error('getLocalIP error:', error);
      return Promise.resolve('')
    }
  }

}).call(GlobalTab);
