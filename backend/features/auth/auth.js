import PocketBase from "pocketbase";

const pb = new PocketBase("http://127.0.0.1:8090");

// This method initializes a one-off realtime subscription and will
// open a popup window with the OAuth2 vendor page to authenticate.
//
// Once the external OAuth2 sign-in/sign-up flow is completed, the popup
// window will be automatically closed and the OAuth2 data sent back
// to the user through the previously established realtime connection.
//
// If the popup is being blocked on Safari, make sure that your click handler is not using async/await.
pb.collection("users")
  .authWithOAuth2({
    provider: "google",
  })
  .then((authData) => {
    console.log(authData);

    // after the above you can also access the auth data from the authStore
    console.log(pb.authStore.isValid);
    console.log(pb.authStore.token);
    console.log(pb.authStore.record.id);

    // "logout" the last authenticated record
    pb.authStore.clear();
  });
