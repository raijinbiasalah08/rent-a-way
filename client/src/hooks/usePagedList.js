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
  const [settledFilterKey, setSettledFilterKey] = useState(filterKey);
  const [error, setError] = useState(null);
  useEffect(() => {
    const timeout = window.setTimeout(() => setSettledFilterKey(filterKey), 250);
    return () => window.clearTimeout(timeout);
  }, [filterKey]);
  useEffect(() => {
    setPage(1);
  }, [filterKey]);
  useEffect(() => {
    if (filterKey !== settledFilterKey) return undefined;

    let current = true;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api
      .get(url, {
        params: { ...JSON.parse(settledFilterKey), page, limit: 50 },
        signal: controller.signal,
      })
      .then((result) => {
        if (current) {
          setData(result.data.data);
          setTotalPages(Math.max(1, result.data.pagination.totalPages));
        }
      })
      .catch((error) => {
        if (current && error.code !== "ERR_CANCELED") {
          setError(error);
          toast.error(
            error.response?.data?.message || "Could not load records.",
          );
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [url, filterKey, settledFilterKey, page, revision]);
  return {
    data,
    loading,
    error,
    page,
    setPage,
    totalPages,
    reload: () => setRevision((value) => value + 1),
  };
}
