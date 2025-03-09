async function removePicture(userId: string) {
  return await fetch(`/private-api/picture`, {
    method: "DELETE",
    headers: {
      "X-User-ID": userId,
    },
  });
}

function uploadPicture(userId: string, image: File) {
  const formData = new FormData();
  formData.append("image", image);

  return fetch(`/private-api/picture`, {
    method: "POST",
    headers: {
      "X-User-ID": userId,
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
