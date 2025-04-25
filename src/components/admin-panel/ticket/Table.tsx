import React, { useEffect, useState } from "react";
import { HiOutlineExclamationCircle } from "react-icons/hi2";
import {
  IoCloseCircleOutline,
  IoCheckmarkCircleOutline,
} from "react-icons/io5";
import { SlEye } from "react-icons/sl";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import SupportTicket from "./SupportTicket";
import axios from "axios";

// Define types for tickets and messages
interface Message {
  id: string;
  text: string;
  time: string;
  sender: "support" | "user";
  attachment?: string;
}

interface Ticket {
  id: string;
  row: string;
  method: string;
  image: string;
  name: string;
  date: string;
  status: "pending" | "answered" | "closed" | "open";
  ticketId: string;
  messages: Message[];
}

interface TableProps {
  ticketType?: string;
}

export default function Table({ ticketType }: TableProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    fetchTickets();
  }, [ticketType]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        "https://109.230.200.230:7890/api/v1/Admins/Tickets",
        {
          params: {
            page: 1,
            pageSize: 10,
            orderBy: "CreationTime",
            sortOrder: "DESC",
            ticketType: ticketType || undefined,
          },
          withCredentials: true,
        }
      );

      const formattedTickets: Ticket[] = response.data.map(
        (ticket: any, index: number) => ({
          id: ticket.id,
          row: (index + 1).toString(),
          method: ticket.title,
          image: ticket.image,
          name: `${ticket.firstName} ${ticket.lastName}`,
          date: new Date(ticket.creationTime).toLocaleDateString("fa-IR"),
          status: mapStatus(ticket.ticketStatus),
          ticketId: ticket.id,
          messages: [],
        })
      );

      setTickets(formattedTickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const mapStatus = (status: string): Ticket["status"] => {
    switch (status) {
      case "Pending":
        return "pending";
      case "Answered":
        return "answered";
      case "Closed":
        return "closed";
      case "Open":
        return "open";
      default:
        return "pending";
    }
  };

  const handleOpenModal = async (ticket: Ticket) => {
    try {
      const response = await axios.get(
        `https://109.230.200.230:7890/api/v1/Admins/Tickets/${ticket.ticketId}/Messages`,
        {
          withCredentials: true,
        }
      );

      const formattedMessages: Message[] = response.data.map((msg: any) => ({
        id: msg.id,
        text: msg.text,
        time: new Date(msg.creationTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        sender: msg.fromAdmin ? "support" : "user",
        attachment: msg.hasAttachment ? msg.id : undefined,
      }));

      setSelectedTicket({
        ...ticket,
        messages: formattedMessages,
      });
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching ticket messages:", error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTicket(null);
    fetchTickets();
  };

  const handleCloseTicket = async (ticketId: string) => {
    console.log(`Closing ticket ${ticketId}`);
    
    try {
      // Call API to close ticket
      await axios.delete(
        `https://109.230.200.230:7890/api/v1/Admins/Tickets/${ticketId}/Close`,
        {
          withCredentials: true,
        }
      );

      // Update ticket status in state
      setSelectedTicket((prev) =>
        prev ? { ...prev, status: "closed" } : null
      );

      // Refresh tickets list
      fetchTickets();
    } catch (error) {
      console.error("Error closing ticket:", error);
    }
  };

  const handleSendMessage = async (ticketId: string, text: string, sender: "support" | "user") => {
    // First show message temporarily
    setSelectedTicket((prev) =>
      prev
        ? {
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: `temp-${Date.now()}`,
                text,
                time: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                sender,
              },
            ],
          }
        : null
    );

    // If sender is admin, send message to server
    if (sender === "support") {
      try {
        const formData = new FormData();
        await axios.post(
          `https://109.230.200.230:7890/api/v1/Admins/Tickets/${ticketId}/Messages?text=${encodeURIComponent(
            text
          )}`,
          formData,
          {
            withCredentials: true,
          }
        );

        // Update tickets status after successful send
        setTickets((prevTickets) =>
          prevTickets.map((ticket) =>
            ticket.ticketId === ticketId
              ? { ...ticket, status: "answered" }
              : ticket
          )
        );
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <table className="table">
          <thead className="bg-[#ECF9FD]">
            <tr className="text-[#606060] text-[14px] font-xregular">
              <th>
                <label>
                  <input type="checkbox" className="checkbox p-0" />
                </label>
              </th>
              <th> ردیف </th>
              <th> نام کاربر </th>
              <th> تاریخ ثبت </th>
              <th> عنوان تیکت </th>
              <th> وضعیت تیکت </th>
              <th> عملیات </th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((item) => (
              <tr
                key={item.id}
                className="odd:bg-[#F9F9F9] even:bg-[#FFFFFF] text-[14px] font-xregular text-[#202020]"
              >
                <th>
                  <label>
                    <input type="checkbox" className="checkbox p-0" />
                  </label>
                </th>
                <td>{item.row}</td>
                <td className="flex items-center gap-2">
                  <img src={item.image} alt="img" />
                  <span>{item.name}</span>
                </td>
                <td>{item.date}</td>
                <td>{item.method}</td>
                <td className="w-fit">
                  {item.status === "pending" ? (
                    <span className="border border-[#E0A03A] text-[#E0A03A] bg-[#FFFBF3] px-2 py-1 rounded-lg w-fit flex items-center gap-1">
                      <HiOutlineExclamationCircle className="text-[#E0A03A] bg-transparent w-5 h-5 rounded-full" />
                      در انتظار پاسخ
                    </span>
                  ) : item.status === "answered" ? (
                    <span className="border border-[#3BC377] text-[#227346] bg-[#F4FFF9] px-1 py-1 rounded-lg w-fit flex items-center gap-1">
                      <IoCheckmarkCircleOutline className="text-[#3BC377] bg-transparent w-5 h-5 rounded-full" />
                      پاسخ داده شده
                    </span>
                  ) : item.status === "closed" ? (
                    <span className="border border-[#606060] text-[#606060] bg-[#F4F5FC] px-2 py-1 rounded-lg w-fit flex items-center gap-1">
                      <IoCloseCircleOutline className="text-[#606060] bg-transparent w-5 h-5 rounded-full" />
                      بسته شده
                    </span>
                  ) : (
                    <span className="border border-[#44C0ED] text-[#44C0ED] bg-[#ECF9FD] px-2 py-1 rounded-lg w-[100px] flex items-center gap-1">
                      <IoCheckmarkCircleOutline className="text-[#44C0ED] bg-transparent w-5 h-5 rounded-full" />
                      باز
                    </span>
                  )}
                </td>
                <td>
                  <button onClick={() => handleOpenModal(item)}>
                    <SlEye className="h-[22px] w-[22px] text-[#868686] cursor-pointer hover:text-[#44C0ED]" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center mt-[35px] w-full">
        <div className="w-3/12">
          <span className="text-[#868686] font-xregular text-[12px]">
            نمایش <span className="text-[#202020] font-xbold">8</span> از 68
            نتیجه
          </span>
        </div>
        <div className="join flex items-center justify-center w-full mr-[-190px] text-[14px] font-xregular gap-[9px]">
          <button className="bg-[#EDEDED] p-[6px] rounded-[6.67px]">
            <IoIosArrowForward className="w-4 h-4 text-[#606060]  rounded-[4px]" />
          </button>
          <button className="bg-[#F1F8FF] px-[10.8px] py-[2.8px] rounded-[6.67px]">
            1
          </button>
          <button className="bg-[#F1F8FF] px-[10.8px] py-[2.8px] rounded-[6.67px]">
            2
          </button>
          <button className="bg-[#F1F8FF] px-[10.8px] py-[2.8px] rounded-[6.67px]">
            3
          </button>
          <button className="bg-[#EDEDED] p-[6px] rounded-[6.67px]">
            <IoIosArrowBack className="w-4 h-4 text-[#606060] " />
          </button>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-[16px] w-full max-w-[780px] mx-auto h-full max-h-[541px]  overflow-hidden ">
            <SupportTicket
              ticketId={selectedTicket.ticketId}
              ticketSubject={selectedTicket.method}
              ticketDate={selectedTicket.date}
              ticketStatus={selectedTicket.status}
              messages={selectedTicket.messages}
              onSendMessage={(text) =>
                handleSendMessage(selectedTicket.ticketId, text, "support")
              }
              onCloseTicket={() => handleCloseTicket(selectedTicket.ticketId)}
              onClose={handleCloseModal}
            />
          </div>
        </div>
      )}
    </div>
  );
}
