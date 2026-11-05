import { useEffect, useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
export default function usePagedList(url, filters = {}) {
  const [data, setData] = useState([]),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState(1),
    [totalPages, setTotalPages] = useState(1),
    [revision, setRevision] = useState(0);
  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    setPage(1);
  }, [filterKey]);
  useEffect(() => {
    let current = true;
    setLoading(true);
    api
      .get(url, { params: { ...JSON.parse(filterKey), page, limit: 50 } })
      .then((result) => {
        if (current) {
          setData(result.data.data);
          setTotalPages(Math.max(1, result.data.pagination.totalPages));
        }
      })
      .catch((error) => {
        if (current)
          toast.error(
            error.response?.data?.message || "Could not load records.",
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [url, filterKey, page, revision]);
  return {
    data,
    loading,
    page,
    setPage,
    totalPages,
    reload: () => setRevision((value) => value + 1),
  };
}
