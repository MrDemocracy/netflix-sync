# netflix-sync
Stolen from [Jeremy Pyne's blogspot page](https://pynej.blogspot.com/2017/07/netflix-to-trakttv-sync.html):

>Netflix to Trakt.tv Sync
>There used to be a nice [Chrome plugin](https://chrome.google.com/webstore/detail/traktflix-netflix-and-tra/bmoemkaigjgcgjjnpmdgkifndiidkeji?hl=en) to synchronize by Netflix history with [Trakt.tv](https://trakt.tv/) but it had been unreliable and doesn't seam to be working now.  I wrote this code to solve my own need but it does the same thing and I am posting it here for others to use. 
>
>Note that this is not 100% perfect as some show names aren't exactly the same and some Netflix show's don't use episode names at all. This code it not using any Netflix API calls but rather just scraping your Viewing Activity page and then making API calls to your Trakt.tv account to post the item's it finds.
>
>You may need to manually select some episodes or shows on the Tract.tv side if they aren't matched and it is possible that duplicates could get synced if the names cause issues though I tried to prevent this. In short I'm not out to make this 100% perfect but it should get you 90% of the way and it shows all the changes it will post for confirmation before posting.
>
>**USAGE**
>
><li>Drag this link, <strong>Sync to Trakt.tv</strong> <code><i>(Goto <a href="https://pynej.blogspot.com/2017/07/netflix-to-trakttv-sync.html">Jeremy Pyne's blogspot page</a> or <a href="run">here</a> to get the run script.)</i></code>, <ul>to your bookmark bar or bookmerks menu.</ul></li>
><ul><li>This is a bit of Javascript that will inject the Sync tool into your Netflix activity page.</li></ul>
><li>Open Netflix in your browser and log in.</li>
><ul><li>This is tested and working in Safari and Chrome.</ul></li>
><li>Go here https://www.netflix.com/viewingactivity to see your history or click on your name in the top right, <ul>then on Account, and finally on Viewing Activity.</ul></li>
><li>Netflix will not load your entire history so you will need to scroll down to get it to load more.<ul>  Keep doing this until all the history you want to sync has been loaded.</ul></li>
><ul><li>You don't have to do everything, if you are doing this regularly then the first screen or two will be sufficient.</ul></li>
><li>Now for the magic click the bookmarklet you added while looking at the history page.</li>
><ul><li><strong>Note:</strong> The first tim you do this you will need to log in to Trakt.tv and click the bookmark again.</ul></li>
><li>The script will scrape the Netflix page, they check each item in Trakt.tv and build a list of already synced <ul>items, items not found, and items scheduled to sync.</ul></li>
><ul><li>If re-running the tool past plays will be greyed out, new plays to by synced will be green,  items that could not be cached will remain white, and duplicate plays that are being ignored will be orange.</ul></li>
><li>When you are satisfied just click Sync Now to post the changes.  You can then check Trakt.tv or <ul>reload the page and run the script again to see the results.</ul></li>
>
><br><strong>HOW IT WORKS</strong></br>
>
>This solution is a simple bit of javascript that scans your Netflix [history page](https://www.netflix.com/viewingactivity) and sync's plays over to Trakt.tv. It also needs to read your list of past plays in Trakt.tv along with the history it reads from the Netflix page.
>
>None of this data is saved or sent to any other servers in any way. As the script runs a listing of all the changes that will be posted to Trakt.tv is show with a confirmation option. No passwords or logins are prompted or recorded in any way. You are logging in yourself to Netflix and Trakt.tv, though you do have to grant this application API access to your account. The only bit that is saved is the Trakt.tv access token so that you don't have to log in on every use of the tool. You can even remove this by clearing the cookies for the www.netflix.com domain.
>
>You can view the entire script [here](https://www.inkonit.com/netflix/netflix-sync.js) first if you wish. The bookmarklet code is an easy way to inject this code into your netflix page, you could also run this code manually in your browser console.
>
>```javascript
>function load(filename){
> if(filename.endsWith('.js')){
>  var fileref=document.createElement('script');
>  fileref.setAttribute('type','text/javascript');
>  fileref.setAttribute('src',filename);
> }
> else if (filename.endsWith('.css')){
>  var fileref=document.createElement('link');
>  fileref.setAttribute('rel','stylesheet');
>  fileref.setAttribute('type','text/css');
>  fileref.setAttribute('href',filename);
> }
> document.getElementsByTagName('head')[0].appendChild(fileref);
>}
>load('https://code.jquery.com/ui/1.12.1/jquery-ui.js', 'js');
>load('https://www.inkonit.com/netflix/netflix-sync.js','js');
>load('https://www.inkonit.com/netflix/netflix-sync.css','css');
>```
