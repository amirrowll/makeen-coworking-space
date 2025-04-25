"use client";
import React, { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import { LuUserRoundX } from "react-icons/lu";
import { SlEye } from "react-icons/sl";

import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import Image from "next/image";

import DeleteModal from "./DeleteModal";
import Pagination from "../Pagination";

interface UserData {
  id: string;
  row: string;
  email: string;
  name: string;
  date: string;
  card: string;
  number: string;
  image: string;
}

interface ApiResponse {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  creationTime: string;
  nationalCode: string;
  phoneNumber: string;
  hasProfilePhoto: boolean;
}

interface ApiResult {
  data: ApiResponse[];
  totalCount: number;
}

interface TableProps {
  onSelectUsers: (selectedIds: string[]) => void;
  userTypeFilter: number; // نوع کاربر (0: Newest, 1: Banned, 2: MakeenStudent, 3: ForcedCoWorks)
}

export default function Table({ onSelectUsers, userTypeFilter }: TableProps) {
  const [info, setInfo] = useState<UserData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10); // تعداد کاربران در هر صفحه
  const [totalUsers, setTotalUsers] = useState<number>(0); // تعداد کل کاربران

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get<ApiResponse[]>(
          `https://109.230.200.230:7890/api/v1/Admins/Users?page=${currentPage}&pageSize=${pageSize}&userType=${userTypeFilter}&orderBy=CreationTime&sortOrder=DESC`,
          { withCredentials: true }
        );

        // بررسی وجود هدر تعداد کل آیتم‌ها
        let totalCount = 0;

        // اگر هدر x-total-count وجود دارد، از آن استفاده کن
        if (response.headers["x-total-count"]) {
          totalCount = parseInt(response.headers["x-total-count"], 10);
        }
        // اگر تعداد کل در بدنه پاسخ وجود دارد (بسته به API شما)
        else if (
          response.data &&
          typeof response.data === "object" &&
          "totalCount" in response.data
        ) {
          // اگر API کل اطلاعات را در یک آبجکت با فیلدهای data و totalCount بر می‌گرداند
          const result = response.data as unknown as ApiResult;
          totalCount = result.totalCount;
        }
        // در غیر این صورت، از تعداد آیتم‌های دریافتی استفاده کن
        else {
          totalCount = response.data.length;
        }

        setTotalUsers(totalCount);

        const formattedData: UserData[] = await Promise.all(
          response.data.map(async (item, index) => {
            let profileImage = "/admin-panel/Profile-Pic-Small.svg";

            if (item.hasProfilePhoto) {
              try {
                const imageResponse = await axios.get(
                  `https://109.230.200.230:7890/api/v1/Admins/Users/${item.id}/Profile-Photo`,
                  {
                    withCredentials: true,
                    responseType: "blob",
                  }
                );

                profileImage = URL.createObjectURL(imageResponse.data);
              } catch (imgError: AxiosError | Error) {
                console.error(
                  `خطا در دریافت عکس پروفایل کاربر ${item.id}: ${imgError.message}`
                );
              }
            }

            return {
              id: item.id,
              row: ((currentPage - 1) * pageSize + index + 1).toString(),
              email: item.email || "نامشخص",
              name: `${item.firstName} ${item.lastName}`,
              date: new Date(item.creationTime).toLocaleDateString("fa-IR"),
              card: item.nationalCode,
              number: item.phoneNumber,
              image: profileImage,
            };
          })
        );

        setInfo(formattedData);
        setError(null);
        // فرض می‌کنیم API تعداد کل کاربران را در هدر یا بدنه پاسخ برمی‌گرداند
        // اگر API تعداد کل را برمی‌گرداند، باید آن را اینجا تنظیم کنیم
        setTotalUsers(68); // این مقدار باید از API گرفته شود (برای مثال از هدر یا بدنه پاسخ)
      } catch (error) {
        if (error instanceof Error) {
          setError(`خطا در بارگذاری داده‌ها: ${error.message}`);
        } else {
          setError("خطا در بارگذاری داده‌ها: خطای ناشناخته");
        }
      }
    };

    fetchData();

    // cleanup برای آزادسازی
    return () => {
      // Clean up blob URLs
      info.forEach((item) => {
        if (item.image.startsWith("blob:")) {
          URL.revokeObjectURL(item.image);
        }
      });
    };
  }, [currentPage, userTypeFilter, pageSize]); // Added pageSize to dependency array

  const handleCheckboxChange = (id: string) => {
    setSelectedIds((prev) => {
      const newSelectedIds = prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id];
      onSelectUsers(newSelectedIds);
      return newSelectedIds;
    });
  };

  const handleDeleteClick = (user: UserData) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    try {
      await axios.patch(
        `https://109.230.200.230:7890/api/v1/Admins/${selectedUser.id}/Ban`,
        {},
        { withCredentials: true }
      );
      setInfo((prevInfo) => prevInfo.filter((item) => item.id !== selectedUser.id));
      // کاهش تعداد کل کاربران پس از حذف
      setTotalUsers((prev) => Math.max(0, prev - 1));
      setIsModalOpen(false);
      setSelectedUser(null);
    } catch (error: AxiosError | Error | unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "خطای ناشناخته";
      setError(`خطا در بن کردن کاربر: ${errorMessage}`);
      setIsModalOpen(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div>
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded">{error}</div>
      )}
      <div className="overflow-x-auto">
        <table className="table">
          <thead className="bg-[#ECF9FD]">
            <tr className="text-[#606060] text-[14px] font-xregular">
              <th>
                <label>
                  <input type="checkbox" className="checkbox p-0" />
                </label>
              </th>
              <th>ردیف</th>
              <th>تاریخ عضویت</th>
              <th>نام کاربر</th>
              <th>ایمیل</th>
              <th>کد ملی</th>
              <th>شماره موبایل</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {info.map((item) => (
              <tr
                key={item.id}
                className="odd:bg-[#F9F9F9] even:bg-[#FFFFFF] text-[14px] font-xregular text-[#202020]"
              >
                <th>
                  <label>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => handleCheckboxChange(item.id)}
                    />
                  </label>
                </th>
                <td>{item.row}</td>
                <td>{item.date}</td>
                <td className="flex items-center gap-2">
                  <Image
                    src={item.image}
                    alt="profile"
                    width={24}
                    height={24}
                    className="object-cover rounded-full"
                  />
                  <span>{item.name}</span>
                </td>
                <td>{item.email}</td>
                <td>{item.card}</td>
                <td>{item.number}</td>
                <td className="flex items-center gap-3 text-[#ADADAD]">
                  <button onClick={() => handleDeleteClick(item)}>
                    <LuUserRoundX className="w-[22px] h-[22px] hover:text-red-500" />
                  </button>
                  <SlEye className="w-[22px] h-[22px]" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* استفاده از کامپوننت پگینیشن */}
      <Pagination
        currentPage={currentPage}
        totalItems={totalUsers}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />

      <DeleteModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        userName={selectedUser?.name || ""}
        userId={selectedUser?.id || ""}
      />
    </div>
  );
}