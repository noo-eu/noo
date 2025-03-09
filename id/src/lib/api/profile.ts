function removePicture(sessionId: string) {
  return fetch(`/private-api/picture`, {
    method: "DELETE",
    headers: {
      "X-Session-ID": sessionId,
    },
  });
}

function uploadPicture(sessionId: string, image: File) {
  const formData = new FormData();
  formData.append("image", image);

  return fetch(`/private-api/picture`, {
    method: "POST",
    headers: {
      "X-Session-ID": sessionId,
    },
    body: formData,
  });
}

const Profile = {
  Picture: {
    remove: removePicture,
    upload: uploadPicture,
  },
};

export { Profile };
