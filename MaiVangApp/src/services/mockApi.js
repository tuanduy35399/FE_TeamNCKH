export const mockAccount = {
  Id: 1,
  Name: "Tuấn Duy",
  Email: "tuanduy@example.com",
  UserName: "tuanduy",
  IsAdmin: false,
};

export const mockDiseaseDetails = [
  {
    Id: 101,
    Name: "Bệnh rỉ sắt",
    Information: "Lá có các đốm nhỏ màu nâu rỉ sắt, lây lan nhanh vào mùa mưa.",
    Prompt: "Cách trị bệnh rỉ sắt trên lá mai vàng",
    ImgExample: "https://example.com/risat.jpg",
  },
  {
    Id: 102,
    Name: "Bệnh cháy lá",
    Information: "Lá bị khô cháy từ mép vào trong, thường do nấm hoặc thiếu nước nắng gắt.",
    Prompt: "Nguyên nhân và cách khắc phục mai vàng bị cháy lá",
    ImgExample: "https://example.com/chayla.jpg",
  },
];

export const mockHistoryChats = [
  {
    Id: 1,
    Body: "Đây là lá mai bị gì vậy?",
    CreatedAt: new Date(Date.now() - 86400000).toISOString(),
    ModelResult: {
      Id: 201,
      NameDetect: "Bệnh rỉ sắt",
      ImgDetect: "https://example.com/detected1.jpg",
    },
  },
];

// Mock API Functions
export const apiLogin = async (username, password) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (username === "admin" && password === "123456") {
        resolve({ success: true, data: { ...mockAccount, IsAdmin: true } });
      } else if (username === "user" && password === "123456") {
        resolve({ success: true, data: mockAccount });
      } else {
        reject(new Error("Sai tài khoản hoặc mật khẩu"));
      }
    }, 1000);
  });
};

export const apiUploadImageAndText = async (imageUri, text) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Giả lập AI phân tích và trả về kết quả ngẫu nhiên
      const randomDisease = mockDiseaseDetails[Math.floor(Math.random() * mockDiseaseDetails.length)];
      resolve({
        success: true,
        data: {
          Id: Math.floor(Math.random() * 1000),
          NameDetect: randomDisease.Name,
          ImgDetect: imageUri || randomDisease.ImgExample, 
          // Trả về kèm detail ID để app có thể xem chi tiết
          DiseaseDetailId: randomDisease.Id 
        }
      });
    }, 2000);
  });
};

export const apiGetDiseaseDetail = async (id) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const detail = mockDiseaseDetails.find(d => d.Id === id);
      resolve({ success: true, data: detail });
    }, 500);
  });
};
