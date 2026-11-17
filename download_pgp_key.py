# -*- coding: utf-8 -*-
"""
PGP Key – Xuất key / Mã hóa / Giải mã file.
- Xuất key: chuỗi Base64 -> file .asc (FolderConfigurationView.ascx.cs).
- Mã hóa file: file + public key -> file PGP (PGPCryptographyAlgorithm.EncryptFile).
- Giải mã file: file PGP + private key + passphrase -> file gốc (AsymmetricCryptography.Decrypt).
"""

import base64
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox, filedialog
from datetime import datetime
from pathlib import Path

try:
    import pgpy
    HAS_PGPY = True
except ImportError:
    HAS_PGPY = False


def decode_and_save_key(key_base64: str, key_type: str, code: str = "export") -> str | None:
    """
    Giải mã Base64 và lưu ra file .asc (giống C# Convert.FromBase64String + File.WriteAllBytes).

    :param key_base64: Chuỗi key đã mã Base64 (có thể chứa khoảng trắng/newline, sẽ được loại bỏ)
    :param key_type: "public" hoặc "private"
    :param code: Mã/prefix cho tên file (mặc định "export")
    :return: Đường dẫn file đã lưu, hoặc None nếu lỗi
    """
    if not key_base64 or not key_base64.strip():
        return None
    # Loại bỏ khoảng trắng và newline thừa (chuỗi Base64 có thể paste nhiều dòng)
    key_clean = "".join(key_base64.split())
    try:
        key_bytes = base64.b64decode(key_clean)
    except Exception as e:
        raise ValueError(f"Chuỗi không phải Base64 hợp lệ: {e}")
    # Tên file giống C#: "Public Key_{Code}_{yyyyMMdd_HHmmss}.asc"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    label = "Public Key" if key_type.lower() == "public" else "Private Key"
    default_name = f"{label}_{code}_{timestamp}.asc"
    path = filedialog.asksaveasfilename(
        defaultextension=".asc",
        filetypes=[("PGP Key files (.asc)", "*.asc"), ("All files", "*.*")],
        initialfile=default_name,
    )
    if not path:
        return None
    Path(path).write_bytes(key_bytes)
    return path


def decrypt_pgp_file(
    encrypted_file_path: str,
    private_key_source: str | bytes,
    passphrase: str,
    output_file_path: str,
) -> None:
    """
    Giải mã file PGP (tương tự PGPCryptographyAlgorithm.Decrypt trong C#).
    :param encrypted_file_path: Đường dẫn file đã mã hóa (.pgp / .gpg hoặc bất kỳ)
    :param private_key_source: Đường dẫn file .asc private key HOẶC chuỗi Base64 private key (sẽ decode)
    :param passphrase: Passphrase mở khóa private key (để trống nếu key không bảo vệ)
    :param output_file_path: Đường dẫn file đầu ra (giải mã)
    """
    if not HAS_PGPY:
        raise RuntimeError("Chưa cài thư viện pgpy. Chạy: pip install pgpy")

    # Load private key: từ file hoặc từ Base64
    if isinstance(private_key_source, bytes):
        key_blob = private_key_source
    elif Path(private_key_source).is_file():
        with open(private_key_source, "rb") as f:
            key_blob = f.read()
    else:
        key_clean = "".join(str(private_key_source).split())
        key_blob = base64.b64decode(key_clean)

    key, _ = pgpy.PGPKey.from_blob(key_blob)
    if key.is_public:
        raise ValueError("Cần private key để giải mã, không phải public key.")

    enc_msg = pgpy.PGPMessage.from_file(encrypted_file_path)
    if not enc_msg.is_encrypted:
        raise ValueError("File không phải nội dung PGP đã mã hóa.")

    def _do_decrypt():
        dec = key.decrypt(enc_msg)
        data = dec.message
        if isinstance(data, str):
            data = data.encode("utf-8")
        return data

    if key.is_protected:
        with key.unlock(passphrase):
            out_data = _do_decrypt()
    else:
        out_data = _do_decrypt()

    Path(output_file_path).write_bytes(out_data)


def encrypt_pgp_file(
    input_file_path: str,
    public_key_source: str | bytes,
    output_file_path: str,
    armor: bool = True,
) -> None:
    """
    Mã hóa file bằng PGP public key (tương tự PGPCryptographyAlgorithm.EncryptFile trong C#).
    :param input_file_path: Đường dẫn file cần mã hóa
    :param public_key_source: Đường dẫn file .asc public key HOẶC chuỗi Base64 public key
    :param output_file_path: Đường dẫn file đầu ra (đã mã hóa)
    :param armor: True = xuất dạng ASCII armored (.asc), False = binary
    """
    if not HAS_PGPY:
        raise RuntimeError("Chưa cài thư viện pgpy. Chạy: pip install pgpy")

    if isinstance(public_key_source, bytes):
        key_blob = public_key_source
    elif Path(public_key_source).is_file():
        with open(public_key_source, "rb") as f:
            key_blob = f.read()
    else:
        key_clean = "".join(str(public_key_source).split())
        key_blob = base64.b64decode(key_clean)

    key, _ = pgpy.PGPKey.from_blob(key_blob)
    if not key.is_public:
        raise ValueError("Cần public key để mã hóa, không phải private key.")

    message = pgpy.PGPMessage.new(input_file_path, file=True)
    encrypted = key.encrypt(message)

    out_data = str(encrypted) if armor else bytes(encrypted)
    if isinstance(out_data, str):
        Path(output_file_path).write_text(out_data, encoding="utf-8")
    else:
        Path(output_file_path).write_bytes(out_data)


def main():
    root = tk.Tk()
    root.title("PGP Key – Xuất key / Giải mã file")
    root.minsize(560, 480)
    root.geometry("680x560")

    nb = ttk.Notebook(root)
    nb.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

    # ---------- Tab 1: Xuất key (.asc) ----------
    tab_export = ttk.Frame(nb, padding=8)
    nb.add(tab_export, text="Xuất key (.asc)")

    key_type_var = tk.StringVar(value="public")
    code_var = tk.StringVar(value="export")

    frm_choice = ttk.LabelFrame(tab_export, text="Loại key", padding=8)
    frm_choice.pack(fill=tk.X, pady=6)
    ttk.Radiobutton(frm_choice, text="Public Key", variable=key_type_var, value="public").pack(side=tk.LEFT, padx=(0, 20))
    ttk.Radiobutton(frm_choice, text="Private Key", variable=key_type_var, value="private").pack(side=tk.LEFT)

    frm_code = ttk.Frame(tab_export)
    frm_code.pack(fill=tk.X, pady=4)
    ttk.Label(frm_code, text="Mã tên file (prefix):").pack(side=tk.LEFT, padx=(0, 8))
    ttk.Entry(frm_code, textvariable=code_var, width=20).pack(side=tk.LEFT)

    frm_input = ttk.LabelFrame(tab_export, text="Dán chuỗi Public Key hoặc Private Key (Base64)", padding=6)
    frm_input.pack(fill=tk.BOTH, expand=True, pady=6)
    txt_key = scrolledtext.ScrolledText(frm_input, height=10, width=72, wrap=tk.WORD, font=("Consolas", 9))
    txt_key.pack(fill=tk.BOTH, expand=True)

    def do_download():
        key_type = key_type_var.get()
        code = code_var.get().strip() or "export"
        key_content = txt_key.get("1.0", tk.END)
        if not key_content.strip():
            messagebox.showwarning("Cảnh báo", "Vui lòng dán chuỗi key (Base64) vào ô trên.")
            return
        try:
            path = decode_and_save_key(key_content, key_type, code)
            if path:
                messagebox.showinfo("Thành công", f"Đã lưu key vào:\n{path}")
        except ValueError as e:
            messagebox.showerror("Lỗi", str(e))
        except OSError as e:
            messagebox.showerror("Lỗi ghi file", str(e))

    ttk.Button(tab_export, text="Lưu key ra file .asc (Download)", command=do_download).pack(pady=10)
    ttk.Label(tab_export, text="Chuỗi key trong hệ thống ở dạng Base64. Dán vào ô trên, chọn loại key rồi bấm Lưu.", font=("Segoe UI", 8), foreground="gray").pack(pady=(0, 4))

    # ---------- Tab 2: Giải mã file PGP ----------
    tab_decrypt = ttk.Frame(nb, padding=8)
    nb.add(tab_decrypt, text="Giải mã file PGP")

    encrypted_path_var = tk.StringVar()
    key_source_type_var = tk.StringVar(value="file")  # "file" | "base64"
    key_file_path_var = tk.StringVar()
    passphrase_var = tk.StringVar()

    # Hàng 1: Chọn file đã mã hóa
    frm_enc = ttk.LabelFrame(tab_decrypt, text="File đã mã hóa PGP", padding=6)
    frm_enc.pack(fill=tk.X, pady=6)
    frm_enc_inner = ttk.Frame(frm_enc)
    frm_enc_inner.pack(fill=tk.X)
    ttk.Entry(frm_enc_inner, textvariable=encrypted_path_var, width=55).pack(side=tk.LEFT, padx=(0, 6))

    def browse_encrypted():
        p = filedialog.askopenfilename(title="Chọn file đã mã hóa", filetypes=[("PGP/GPG", "*.pgp *.gpg *.asc"), ("All files", "*.*")])
        if p:
            encrypted_path_var.set(p)

    ttk.Button(frm_enc_inner, text="Chọn file…", command=browse_encrypted).pack(side=tk.LEFT)

    # Hàng 2: Chọn key – File .asc hoặc Chuỗi Base64
    frm_key_choice = ttk.LabelFrame(tab_decrypt, text="Private key (để giải mã)", padding=6)
    frm_key_choice.pack(fill=tk.X, pady=6)
    ttk.Radiobutton(frm_key_choice, text="Chọn file .asc", variable=key_source_type_var, value="file").pack(anchor=tk.W)
    frm_key_file = ttk.Frame(frm_key_choice)
    frm_key_file.pack(fill=tk.X, pady=2)
    ttk.Entry(frm_key_file, textvariable=key_file_path_var, width=50).pack(side=tk.LEFT, padx=(0, 6))

    def browse_key_file():
        p = filedialog.askopenfilename(title="Chọn file Private Key (.asc)", filetypes=[("PGP Key (.asc)", "*.asc"), ("All files", "*.*")])
        if p:
            key_file_path_var.set(p)

    ttk.Button(frm_key_file, text="Chọn file…", command=browse_key_file).pack(side=tk.LEFT)
    ttk.Radiobutton(frm_key_choice, text="Dán chuỗi Private Key (Base64)", variable=key_source_type_var, value="base64").pack(anchor=tk.W, pady=(8, 0))
    txt_key_base64 = scrolledtext.ScrolledText(frm_key_choice, height=5, width=72, wrap=tk.WORD, font=("Consolas", 9))
    txt_key_base64.pack(fill=tk.X, pady=4)

    # Passphrase
    frm_pass = ttk.Frame(tab_decrypt)
    frm_pass.pack(fill=tk.X, pady=4)
    ttk.Label(frm_pass, text="Passphrase (mở khóa private key, để trống nếu không có):").pack(side=tk.LEFT, padx=(0, 8))
    ttk.Entry(frm_pass, textvariable=passphrase_var, width=30, show="*").pack(side=tk.LEFT)

    def do_decrypt():
        enc_path = encrypted_path_var.get().strip()
        if not enc_path or not Path(enc_path).is_file():
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn file đã mã hóa PGP.")
            return
        if key_source_type_var.get() == "file":
            key_path = key_file_path_var.get().strip()
            if not key_path or not Path(key_path).is_file():
                messagebox.showwarning("Cảnh báo", "Vui lòng chọn file Private Key (.asc).")
                return
            key_source = key_path
        else:
            key_b64 = txt_key_base64.get("1.0", tk.END).strip()
            if not key_b64:
                messagebox.showwarning("Cảnh báo", "Vui lòng dán chuỗi Private Key (Base64).")
                return
            key_source = key_b64
        passphrase = passphrase_var.get()
        out_path = filedialog.asksaveasfilename(title="Lưu file đã giải mã", defaultextension="", filetypes=[("All files", "*.*")])
        if not out_path:
            return
        try:
            decrypt_pgp_file(enc_path, key_source, passphrase, out_path)
            messagebox.showinfo("Thành công", f"Đã giải mã và lưu:\n{out_path}")
        except Exception as e:
            messagebox.showerror("Lỗi giải mã", str(e))

    btn_decrypt = ttk.Button(tab_decrypt, text="Giải mã và lưu file", command=do_decrypt)
    btn_decrypt.pack(pady=12)
    if not HAS_PGPY:
        ttk.Label(tab_decrypt, text="Cần cài pgpy: pip install pgpy", font=("Segoe UI", 9), foreground="red").pack(pady=4)
        btn_decrypt.state(["disabled"])

    # ---------- Tab 3: Mã hóa file PGP ----------
    tab_encrypt = ttk.Frame(nb, padding=8)
    nb.add(tab_encrypt, text="Mã hóa file PGP")

    encrypt_input_path_var = tk.StringVar()
    encrypt_key_source_type_var = tk.StringVar(value="file")
    encrypt_key_file_path_var = tk.StringVar()
    # Đuôi file xuất: .pgp hoặc .asc (hiển thị rõ trên giao diện)
    encrypt_ext_var = tk.StringVar(value=".pgp")

    frm_enc_input = ttk.LabelFrame(tab_encrypt, text="File cần mã hóa", padding=6)
    frm_enc_input.pack(fill=tk.X, pady=6)
    frm_enc_input_inner = ttk.Frame(frm_enc_input)
    frm_enc_input_inner.pack(fill=tk.X)
    ttk.Entry(frm_enc_input_inner, textvariable=encrypt_input_path_var, width=55).pack(side=tk.LEFT, padx=(0, 6))

    def browse_encrypt_input():
        p = filedialog.askopenfilename(title="Chọn file cần mã hóa", filetypes=[("All files", "*.*")])
        if p:
            encrypt_input_path_var.set(p)

    ttk.Button(frm_enc_input_inner, text="Chọn file…", command=browse_encrypt_input).pack(side=tk.LEFT)

    frm_enc_pubkey = ttk.LabelFrame(tab_encrypt, text="Public key (để mã hóa)", padding=6)
    frm_enc_pubkey.pack(fill=tk.X, pady=6)
    ttk.Radiobutton(frm_enc_pubkey, text="Chọn file .asc", variable=encrypt_key_source_type_var, value="file").pack(anchor=tk.W)
    frm_enc_key_file = ttk.Frame(frm_enc_pubkey)
    frm_enc_key_file.pack(fill=tk.X, pady=2)
    ttk.Entry(frm_enc_key_file, textvariable=encrypt_key_file_path_var, width=50).pack(side=tk.LEFT, padx=(0, 6))

    def browse_encrypt_key_file():
        p = filedialog.askopenfilename(title="Chọn file Public Key (.asc)", filetypes=[("PGP Key (.asc)", "*.asc"), ("All files", "*.*")])
        if p:
            encrypt_key_file_path_var.set(p)

    ttk.Button(frm_enc_key_file, text="Chọn file…", command=browse_encrypt_key_file).pack(side=tk.LEFT)
    ttk.Radiobutton(frm_enc_pubkey, text="Dán chuỗi Public Key (Base64)", variable=encrypt_key_source_type_var, value="base64").pack(anchor=tk.W, pady=(8, 0))
    txt_encrypt_key_base64 = scrolledtext.ScrolledText(frm_enc_pubkey, height=5, width=72, wrap=tk.WORD, font=("Consolas", 9))
    txt_encrypt_key_base64.pack(fill=tk.X, pady=4)

    frm_ext = ttk.LabelFrame(tab_encrypt, text="Đuôi file xuất (khi lưu)", padding=8)
    frm_ext.pack(fill=tk.X, pady=8)
    ttk.Radiobutton(frm_ext, text=".pgp (binary)", variable=encrypt_ext_var, value=".pgp").pack(side=tk.LEFT, padx=(0, 24))
    ttk.Radiobutton(frm_ext, text=".asc (ASCII armored, dễ đọc)", variable=encrypt_ext_var, value=".asc").pack(side=tk.LEFT)
    ttk.Label(tab_encrypt, text="Tên file gợi ý: tên_file_gốc.đuôi_gốc + .pgp hoặc .asc (vd: report.pdf → report.pdf.pgp)", font=("Segoe UI", 8), foreground="gray").pack(anchor=tk.W, pady=(0, 4))

    def do_encrypt():
        inp_path = encrypt_input_path_var.get().strip()
        if not inp_path or not Path(inp_path).is_file():
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn file cần mã hóa.")
            return
        if encrypt_key_source_type_var.get() == "file":
            key_path = encrypt_key_file_path_var.get().strip()
            if not key_path or not Path(key_path).is_file():
                messagebox.showwarning("Cảnh báo", "Vui lòng chọn file Public Key (.asc).")
                return
            key_source = key_path
        else:
            key_b64 = txt_encrypt_key_base64.get("1.0", tk.END).strip()
            if not key_b64:
                messagebox.showwarning("Cảnh báo", "Vui lòng dán chuỗi Public Key (Base64).")
                return
            key_source = key_b64
        p_in = Path(inp_path)
        ext_out = encrypt_ext_var.get()
        if ext_out not in (".pgp", ".asc"):
            ext_out = ".pgp"
        armor = ext_out == ".asc"
        suggested_base = f"{p_in.stem}{p_in.suffix}{ext_out}"
        out_path = filedialog.asksaveasfilename(
            title="Lưu file đã mã hóa",
            defaultextension=ext_out,
            initialfile=suggested_base,
            filetypes=[
                ("PGP (.pgp)", "*.pgp"),
                ("PGP armored (.asc)", "*.asc"),
                ("All files", "*.*"),
            ],
        )
        if not out_path:
            return
        try:
            encrypt_pgp_file(inp_path, key_source, out_path, armor=armor)
            messagebox.showinfo("Thành công", f"Đã mã hóa và lưu:\n{out_path}")
        except Exception as e:
            messagebox.showerror("Lỗi mã hóa", str(e))

    btn_encrypt = ttk.Button(tab_encrypt, text="Mã hóa và lưu file", command=do_encrypt)
    btn_encrypt.pack(pady=12)
    if not HAS_PGPY:
        ttk.Label(tab_encrypt, text="Cần cài pgpy: pip install pgpy", font=("Segoe UI", 9), foreground="red").pack(pady=4)
        btn_encrypt.state(["disabled"])

    root.mainloop()


if __name__ == "__main__":
    main()
