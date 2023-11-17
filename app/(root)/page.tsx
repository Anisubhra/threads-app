import ThreadCard from "@/components/cards/TheadCard";
import { fetchPosts } from "@/lib/actions/thread.actions";
import { fetchUser } from "@/lib/actions/user.actions";
import { UserButton, currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

interface Props {
  searchParams: { [key: string]: string | undefined };
}

export default async function Home({
  searchParams,
}: Props) {
  const user = await currentUser();
  if (!user) {
    redirect("/onboarding");
    return null;
  }

  const userInfo = await fetchUser(user.id);
  if (!userInfo?.onboarded) redirect("/onboarding");

  const result = await fetchPosts(
    searchParams.page ? +searchParams.page : 1,
    30
  );


  return (
    <>
      <h1 className="head-text text-left text-light-2">Home</h1>

      <section className="mt-9 flex flex-col gap-10">
        {
          result.posts.length === 0 ? (
            <p className="no-result">No threads found</p>
          ) : (
            <>
              {
                result.posts.map((post) => (
                  <ThreadCard
                    key={post._id}
                    id={post._id}
                    currentUserId={user?.id || ''}
                    parentId={post.parentId}
                    content={post.text}
                    author={post.author}
                    community={post.community}
                    createdAt={post.createdAt}
                    comments={post.children}
                  />
                ))
              }
            </>
          )
        }
      </section>
    </>
  )
}