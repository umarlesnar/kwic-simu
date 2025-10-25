(function () {
  console.log("Mock Facebook SDK initialized.");

  window.FB = {
    init: (config) => {
      console.log("Mock FB.init called with:", config);
    },
    login: (callback) => {
      console.log("Mock FB.login called");

      // Open pop-up login window
      const popup = window.open(
        "https://wb.nekhop.com/mock-fb-login.html",
        "MockFacebookLogin",
        "width=400,height=500"
      );

      // Listen for message from pop-up
      window.addEventListener("message", (event) => {
        if (event.data && event.data.type === "MOCK_FB_LOGIN") {
          callback(event.data.response);
        }
      });
    },
    getLoginStatus: (callback) => {
      const response = {
        status: "connected",
        authResponse: {
          accessToken: "mock_access_token_12345",
          userID: "123456789",
          expiresIn: 3600,
        },
      };
      callback(response);
    },
  };
})();
