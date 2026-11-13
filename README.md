# DocScan Pro 📄📸

Trang web quét giấy tờ, tài liệu trực tiếp trên trình duyệt, siêu nhẹ, mượt mà và hoạt động hoàn toàn offline (Client-side). Có thể push lên **GitHub Pages** để chạy miễn phí và an toàn.

## Tính năng nổi bật

1. **Camera Full HD & 60fps**:
   - Tối ưu cấu hình `width: 1920, height: 1080` và `frameRate: 60` mang lại trải nghiệm xem mượt mà nhất.
   - Hỗ trợ đổi camera trước/sau, bật đèn flash (trên điện thoại hỗ trợ).
   - Khung canh tài liệu chuẩn tỉ lệ A4 với hiệu ứng laser scan.

2. **Lưu trữ dữ liệu**:
   - Sử dụng **IndexedDB** trực tiếp trên trình duyệt của máy bạn, không phụ thuộc backend hay server tốn kém, dữ liệu không bị mất khi F5 hoặc tắt trình duyệt.
   - Bảo mật 100%: Toàn bộ tài liệu nằm trên máy người dùng, không bị gửi lên bất kỳ máy chủ bên ngoài nào.

3. **Chỉnh sửa & Bộ lọc scan thông minh**:
   - **Gốc (Màu)**: Giữ nguyên màu sắc ban đầu.
   - **Scan Nét**: Làm nổi bật chữ, làm sáng nền giấy tương tự CamScanner.
   - **Đen Trắng (B&W)**: Chuyển dạng tài liệu photo đen trắng tương phản cao.
   - Xoay 90°, tăng giảm độ sáng và tương phản linh hoạt.

4. **Xuất file đa dạng**:
   - **Xuất PDF**: Ghép nhiều trang đã quét thành 1 file PDF A4 hoàn chỉnh với dung lượng tối ưu.
   - **Xuất Hình ảnh**: Tải từng trang dưới dạng file JPG nét cao.

---

## Hướng dẫn đưa lên GitHub Pages

1. **Khởi tạo Git repo trong thư mục này** (nếu chưa có):
   ```bash
   git init
   git add .
   git commit -m "Initial commit DocScan Pro"
   ```

2. **Đưa lên GitHub**:
   - Tạo một repository mới trên GitHub (ví dụ đặt tên: `docscan`).
   - Liên kết và push code:
     ```bash
     git remote add origin https://github.com/<tai-khoan-cua-ban>/docscan.git
     git branch -M main
     git push -u origin main
     ```

3. **Bật GitHub Pages**:
   - Truy cập vào repository trên GitHub -> vào tab **Settings** -> mục **Pages**.
   - Tại phần **Branch**, chọn nhánh `main` và thư mục `/(root)`, bấm **Save**.
   - Sau khoảng 1-2 phút, bạn sẽ có đường link web dạng: `https://<tai-khoan-cua-ban>.github.io/docscan/` để sử dụng trên máy tính và cả điện thoại.

